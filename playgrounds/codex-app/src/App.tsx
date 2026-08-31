import {
  ActivityTimeline,
  AgentComposer,
  AgentMarkdown,
  AgentMessage,
  AgentTurn,
  AppShell,
  AppNotificationRegion,
  AppRouteOutlet,
  AppServerCrashRecovery,
  AppSidebar,
  AppSidebarCollection,
  AppSidebarFooter,
  AppSidebarItem,
  AppSidebarProjectGroup,
  AppSidebarSection,
  AppWindowChrome,
  AppearanceSettingsPage,
  ApprovalFilePreview,
  ApprovalRequest,
  AutomaticApprovalReview,
  BranchCreationDialog,
  BrowserActivity,
  BrowserWorkspacePanel,
  Button,
  CitationMention,
  CodeReviewSettingsPage,
  CommandExecution,
  CommandOutput,
  ComposerAttachment,
  ComposerContextBar,
  ComposerContextControl,
  ComposerDock,
  ComposerModeIndicator,
  ComposerPermissionMenu,
  ComposerPlanProgress,
  ComposerResourcePicker,
  ConversationContextBar,
  ConversationProjectListbox,
  ConversationThreadShell,
  Dialog,
  EnvironmentSettingsPage,
  FileChangeGroup,
  FileRevertErrorDialog,
  FileReview,
  FileReviewWorkspace,
  GeneralSettingsPage,
  GitSettingsPage,
  HooksSettingsPage,
  IconButton,
  ImagePreviewDialog,
  KeyboardShortcutsPage,
  LocalEnvironmentDialog,
  Menu,
  MenuItem,
  MenuLinkItem,
  MenuSectionLabel,
  MenuSeparator,
  MenuSubmenu,
  McpToolCallGroup,
  McpToolIcon,
  MessageAttachment,
  NewConversationPromptGrid,
  NewConversationStart,
  PersonalizationSettingsPage,
  PlanSelectionPage,
  PullRequestCheckList,
  PullRequestCommentComposer,
  PullRequestList,
  PullRequestMergeReadiness,
  PullRequestPanelSummary,
  PullRequestQueryState,
  PullRequestReviewComposer,
  QueuedPromptList,
  ProjectIndex,
  SearchActivity,
  SourceActivityList,
  SourceSearchActivity,
  SettingsShell,
  StatusBanner,
  StreamNotice,
  SubagentActivity,
  SubagentActivityGroup,
  SubagentAvatar,
  SubagentPanel,
  SubagentTranscriptHeader,
  SystemErrorNotice,
  TerminalPanel,
  TerminalProcessList,
  TerminalTranscript,
  TerminalWorkspaceMismatchNotice,
  ThreadContextEvent,
  ThreadHeader,
  ThreadInterruptionSummary,
  ThreadFloatingButton,
  ThreadMessageNavigationRail,
  ThreadSummaryDelta,
  ThreadSummaryDock,
  ThreadSummaryIconButton,
  ThreadSummaryItem,
  ThreadSummaryPanel,
  ThreadSummaryPopover,
  ThreadSummarySection,
  ThreadThinkingPlaceholder,
  ThreadVirtualizedPlaceholder,
  ToolCallCard,
  TurnDuration,
  UsageSettingsPage,
  WorktreeSettingsPage,
  WorkingDirectoryNotice,
  WorktreeSetupStatus,
  VoiceSettingsPage,
  WorkspacePanel,
  type TerminalEntry,
  type AppRouteOutletStatus,
  type AppSidebarWorktreeStatus,
  type AppearanceSettingsValue,
  type ComposerPermissionOption,
  type ComposerModeKind,
  type ComposerResourceGroup,
  type CodeReviewSettingsValue,
  type GeneralSettingsValue,
  type GitSettingsValue,
  type HookSettingsEntry,
  type KeyboardShortcutCaptureTarget,
  type KeyboardShortcutEntry,
  type ManagedWorktreeEntry,
  type PersonalizationSettingsValue,
  type PlanSelectionCard,
  type QueuedPrompt,
  type SubagentItem,
  type WorktreeSetupPhase,
  type WorktreeSettingsValue,
  type WorktreeSetupStep,
  type VoiceSettingsHotkeyId,
  type VoiceSettingsValue,
} from "codex-ui-kit";
import {
  CurrentBuildIcon,
  type CurrentBuildIconName,
} from "./currentBuildIcons";
import {
  cloneElement,
  Fragment,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { JsonRpcNotification } from "@jaminzhou/codex-app-server-client";
import {
  agentMessageStatus,
  hasActiveTurnWork,
  initialProtocolState,
  isCurrentTurnGroupActive,
  isTurnActive,
  messageAttachmentAccessibleLabel,
  messageAttachmentPreviewSource,
  reduceProtocolNotification,
  settleApprovedCommandReplay,
  settleRejectedFileReplay,
  subagentTimelinePresentation,
  terminalTranscriptEvents,
  type DemoProtocolState,
  type DemoSubagent,
  type ProtocolEventRecord,
} from "./protocol-state";
import { changeStats, reviewContent } from "./diff-lines";
import currentPullRequestSummaryExpandedPreview from "../tests/visual/fixtures/pr-detail-current-26-825-summary-expanded-product.png";
import currentPullRequestSummaryPreview from "../tests/visual/fixtures/pr-detail-current-26-825-summary-product.png";
import { LiveApprovalSubmissionGate } from "./live-approval-submission-gate";
import {
  isScenarioId,
  replayScenarios,
  type ReplayScenario,
  type ReplayScenarioId,
} from "./replay";
import {
  resolveReviewSelection,
  type ReviewSelection,
} from "./review-selection";
import {
  contextualizeWorkspaceReplay,
  hostSelectionUsesInPlaceBranch,
  workspaceExecutionCwd,
} from "./workspace-replay";
import { branchStateAfterSuccessfulCreation } from "./workspace-branch-state";
import { trimBranchInputAsciiWhitespace } from "../../../src/internal/branchName";
import { currentKeyboardShortcuts } from "./current-keyboard-shortcuts";
import {
  currentBusinessPlanCards,
  currentPersonalPlanCards,
  currentUsageLimitGroups,
} from "./current-usage-settings";
import {
  hasMcpToolCallGroupForTurn,
  mcpToolCallGroupDurationMs,
  mcpToolCallGroupForEntry,
  mcpToolCallGroupStatus,
  mcpToolCallPresentation,
} from "./mcp-tool-call-view";
import {
  initialPullRequestLifecycleState,
  reducePullRequestLifecycle,
  type PullRequestLifecycleAction,
} from "./pull-request-lifecycle";
import {
  applyDemoThemePreference,
  isDemoThemeView,
  parseDemoThemePreference,
  resolveDemoThemePreference,
  type DemoThemePreference,
} from "./theme";
import {
  canMoveDemoRoute,
  createDemoRouteHistory,
  currentDemoRoute,
  moveDemoRoute,
  pushDemoRoute,
  type DemoView,
} from "./route-history";

type SidebarGlyphName =
  | "activity"
  | "activity-attention"
  | "automation"
  | "archive-current"
  | "chevron-current"
  | "explore-current"
  | "folder"
  | "folder-current"
  | "help-current"
  | "more"
  | "more-current"
  | "new"
  | "pin"
  | "pin-current"
  | "plugins"
  | "plugins-current"
  | "pull-request"
  | "quick"
  | "search"
  | "sidebar"
  | "settings"
  | "sites"
  | "thread";

type SummaryGlyphName =
  | "branch"
  | "changes"
  | "commit"
  | "computer"
  | "github"
  | "globe"
  | "link";

function SidebarGlyph({ name }: { name: SidebarGlyphName }) {
  if (name === "activity") {
    return <CurrentBuildIcon name="sidebar-activity" />;
  }
  if (name === "activity-attention") {
    return <CurrentBuildIcon name="sidebar-activity-attention" />;
  }
  if (name === "new") {
    return <CurrentBuildIcon name="sidebar-new-chat" />;
  }
  if (name === "quick") {
    return <CurrentBuildIcon name="sidebar-quick-chat" />;
  }
  if (name === "search") {
    return <CurrentBuildIcon name="sidebar-search" />;
  }
  if (name === "automation") {
    return <CurrentBuildIcon name="sidebar-scheduled" />;
  }
  if (name === "folder-current") {
    return <CurrentBuildIcon name="sidebar-folder" />;
  }
  if (name === "archive-current") {
    return <CurrentBuildIcon name="sidebar-archive" />;
  }
  if (name === "chevron-current") {
    return <CurrentBuildIcon name="sidebar-mode-chevron" />;
  }
  if (name === "help-current") {
    return <CurrentBuildIcon name="sidebar-help" />;
  }
  if (name === "more-current") {
    return <CurrentBuildIcon name="sidebar-more" />;
  }
  if (name === "pin-current") {
    return <CurrentBuildIcon name="sidebar-pin" />;
  }
  if (name === "plugins-current") {
    return <CurrentBuildIcon name="sidebar-plugins" />;
  }
  if (name === "pull-request") {
    return <CurrentBuildIcon name="sidebar-pull-request" />;
  }
  if (name === "explore-current") {
    return <CurrentBuildIcon name="sidebar-explore" />;
  }
  if (name === "sites") {
    return <CurrentBuildIcon name="sidebar-sites" />;
  }
  const path = {
    folder:
      "M1.75 4.5h4l1.2 1.5h7.3v6.25a1.5 1.5 0 0 1-1.5 1.5H3.25a1.5 1.5 0 0 1-1.5-1.5V4.5Zm0 2h12.5",
    more: "M3.25 8h.01M8 8h.01M12.75 8h.01",
    pin: "m5.25 2.5 5.5 5.5M9.6 1.6l4.8 4.8-2.15 1.05-3.7 3.7-1.05 2.15-4.8-4.8 2.15-1.05 3.7-3.7L9.6 1.6ZM8 11l-3 3",
    plugins:
      "M6.25 1.75v3M9.75 1.75v3M4.5 4.75h7v2.5A3.5 3.5 0 0 1 8 10.75v3.5M2 7.25h12",
    sidebar: "M2.25 3.5h11.5v9H2.25v-9Zm4 0v9",
    settings:
      "M8 5.5A2.5 2.5 0 1 1 8 10.5 2.5 2.5 0 0 1 8 5.5Zm0-3.75.8 1.3 1.55.35 1.2-.95 2 2-.95 1.2.35 1.55 1.3.8-1.3.8-.35 1.55.95 1.2-2 2-1.2-.95-1.55.35L8 14.25l-.8-1.3-1.55-.35-1.2.95-2-2 .95-1.2-.35-1.55L1.75 8l1.3-.8.35-1.55-.95-1.2 2-2 1.2.95 1.55-.35L8 1.75Z",
    thread:
      "M2.25 3.25h11.5v7.5H7L3.25 13.5v-2.75h-1V3.25Z",
  }[name];
  return (
    <svg aria-hidden="true" className="demo-sidebar-glyph" viewBox="0 0 16 16">
      <path d={path} />
    </svg>
  );
}

function CurrentPullRequestRouteIcon({
  name,
}: {
  name: "filter" | "search";
}) {
  const path =
    name === "search"
      ? "M7.33057 1.98535C10.2484 1.98535 12.6136 4.3508 12.6138 7.26855C12.6138 8.58031 12.1346 9.77942 11.3433 10.7031L13.9897 13.3496C14.1655 13.5253 14.1655 13.8106 13.9897 13.9863C13.814 14.1621 13.5288 14.1621 13.353 13.9863L10.7017 11.335C9.78678 12.0942 8.61243 12.5518 7.33057 12.5518C4.41281 12.5516 2.04736 10.1864 2.04736 7.26855C2.04754 4.35091 4.41292 1.98553 7.33057 1.98535ZM7.33057 2.88574C4.90998 2.88592 2.94793 4.84796 2.94775 7.26855C2.94775 9.68929 4.90987 11.6522 7.33057 11.6523C9.75141 11.6523 11.7144 9.6894 11.7144 7.26855C11.7142 4.84786 9.75131 2.88574 7.33057 2.88574Z"
      : "M16.0013 5.00024C16.0013 4.44715 15.5534 3.99847 15.0003 3.99829H5.00031C4.4471 3.99829 3.99835 4.44704 3.99835 5.00024V5.97583C3.99835 6.24147 4.10349 6.49697 4.29132 6.68481L7.48175 9.87524L7.63702 10.0461C7.97691 10.461 8.16534 10.9826 8.16534 11.5237V15.1663C8.16534 15.3015 8.24656 15.4238 8.3714 15.4758L11.3714 16.7258C11.592 16.8176 11.8353 16.6553 11.8353 16.4163V11.5237C11.8353 10.9054 12.0808 10.3125 12.5179 9.87524L15.7083 6.68481L15.7747 6.6106C15.9206 6.43239 16.0013 6.20818 16.0013 5.97583V5.00024ZM17.3314 5.97583C17.3314 6.51694 17.144 7.03943 16.804 7.45435L16.6487 7.62524L13.4583 10.8157C13.2706 11.0035 13.1653 11.2581 13.1653 11.5237V16.4163C13.1653 17.6044 11.9564 18.4103 10.8597 17.9534L7.85968 16.7034C7.23925 16.4448 6.83527 15.8384 6.83527 15.1663V11.5237C6.83527 11.258 6.72917 11.0035 6.54132 10.8157L3.35089 7.62524C2.91364 7.18798 2.66827 6.59421 2.66827 5.97583V5.00024C2.66827 3.7125 3.71256 2.66821 5.00031 2.66821H15.0003C16.2879 2.66839 17.3314 3.71261 17.3314 5.00024V5.97583Z";
  return (
    <svg
      aria-hidden="true"
      data-current-pull-request-icon={name}
      viewBox={name === "search" ? "0 0 16 16" : "0 0 20 20"}
    >
      <path d={path} fill="currentColor" />
    </svg>
  );
}

type CurrentPullRequestIconName =
  | "branch"
  | "checks"
  | "comments"
  | "edit"
  | "merge"
  | "plus"
  | "restore"
  | "reviewers"
  | "status";

function CurrentPullRequestIcon({
  name,
}: {
  name: CurrentPullRequestIconName;
}) {
  if (name === "branch") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <circle cx="5.4165" cy="5" r="1.875" />
        <circle cx="5.4165" cy="15" r="1.875" />
        <circle cx="14.5833" cy="5" r="1.875" />
        <path d="M5.4165 6.66664V13.3333" />
        <path d="M5.41658 12.5V11.6667C5.41658 10.7462 6.16278 10 7.08325 10H12.9166C13.8371 10 14.5833 9.25381 14.5833 8.33333V7.5" />
      </svg>
    );
  }
  if (name === "reviewers") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path
          d="M16.585 10C16.585 6.3632 13.6368 3.41504 10 3.41504C6.3632 3.41504 3.41504 6.3632 3.41504 10C3.41504 11.9528 4.26592 13.7062 5.61621 14.9121C6.6544 13.6452 8.23235 12.835 10 12.835C11.7674 12.835 13.3447 13.6454 14.3828 14.9121C15.7334 13.7062 16.585 11.9531 16.585 10ZM10 14.165C8.67626 14.165 7.49115 14.7585 6.69531 15.6953C7.66679 16.2602 8.79525 16.585 10 16.585C11.2041 16.585 12.3316 16.2597 13.3027 15.6953C12.5069 14.759 11.3233 14.1651 10 14.165ZM11.835 8.5C11.835 7.48656 11.0134 6.66504 10 6.66504C8.98656 6.66504 8.16504 7.48656 8.16504 8.5C8.16504 9.51344 8.98656 10.335 10 10.335C11.0134 10.335 11.835 9.51344 11.835 8.5ZM17.915 10C17.915 14.3713 14.3713 17.915 10 17.915C5.62867 17.915 2.08496 14.3713 2.08496 10C2.08496 5.62867 5.62867 2.08496 10 2.08496C14.3713 2.08496 17.915 5.62867 17.915 10ZM13.165 8.5C13.165 10.248 11.748 11.665 10 11.665C8.25202 11.665 6.83496 10.248 6.83496 8.5C6.83496 6.75202 8.25202 5.33496 10 5.33496C11.748 5.33496 13.165 6.75202 13.165 8.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "comments") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path
          d="M11.335 12.083C11.3347 9.97242 9.44966 8.16504 7 8.16504C4.55034 8.16504 2.66527 9.97242 2.66504 12.083C2.66504 12.8512 2.90887 13.5704 3.33691 14.1797C3.4302 14.3125 3.47218 14.4745 3.4541 14.6357C3.40535 15.0678 3.31415 15.4843 3.19922 15.8877C3.66136 15.8098 4.10651 15.6986 4.54297 15.5508L4.66699 15.5215C4.79159 15.5045 4.91938 15.5238 5.03516 15.5771C5.62294 15.8481 6.2901 16.002 7 16.002C9.44981 16.002 11.335 14.1938 11.335 12.083ZM17.335 7.91309C17.3348 5.80247 15.4497 3.99512 13 3.99512C11.5595 3.99512 10.298 4.62925 9.51465 5.58496C9.28182 5.86891 8.86214 5.9105 8.57812 5.67773C8.29409 5.44493 8.25257 5.02526 8.48535 4.74121C9.52649 3.47094 11.1693 2.66504 13 2.66504C16.0729 2.66504 18.6648 4.96138 18.665 7.91309C18.665 8.8753 18.3824 9.77408 17.8984 10.5459C17.9866 11.1153 18.1604 11.6767 18.3848 12.2568C18.4665 12.4681 18.4355 12.7068 18.3018 12.8896C18.1681 13.0723 17.9505 13.1739 17.7246 13.1602C16.8659 13.1076 16.0585 12.9617 15.2734 12.7178C15.1054 12.7861 14.9347 12.8511 14.7588 12.9043C14.4073 13.0104 14.036 12.8113 13.9297 12.46C13.8235 12.1084 14.0226 11.7372 14.374 11.6309C14.5782 11.5692 14.7758 11.4944 14.9648 11.4072L15.084 11.3652C15.2063 11.3351 15.3361 11.3399 15.457 11.3809C15.8932 11.5286 16.338 11.6399 16.7998 11.7178C16.6849 11.3144 16.5946 10.8978 16.5459 10.4658C16.5278 10.3046 16.5698 10.1426 16.6631 10.0098C17.0911 9.40048 17.335 8.68131 17.335 7.91309ZM12.665 12.083C12.665 15.0349 10.073 17.332 7 17.332C6.19184 17.332 5.42143 17.1731 4.72266 16.8887C4.04698 17.0983 3.35521 17.2365 2.62793 17.3037L2.27539 17.3301C2.04946 17.3438 1.83192 17.2422 1.69824 17.0596C1.56452 16.8767 1.53354 16.638 1.61523 16.4268L1.79297 15.9375C1.93133 15.5279 2.03737 15.1238 2.10059 14.7158C1.61678 13.9441 1.33496 13.045 1.33496 12.083C1.33519 9.13134 3.92709 6.83496 7 6.83496C10.0729 6.83496 12.6648 9.13134 12.665 12.083Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "checks") {
    return (
      <svg aria-hidden="true" viewBox="0 0 18 18">
        <g transform="rotate(-90 9 9)">
          <circle cx="9" cy="9" r="5.75" stroke="#22c55e" />
          <circle
            cx="9"
            cy="9"
            r="5.75"
            stroke="#facc15"
            strokeDasharray="10 36.13"
          />
        </g>
      </svg>
    );
  }
  if (name === "edit") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path
          d="M11.7313 4.20472C13.1489 2.92391 15.3377 2.96644 16.7039 4.33265L16.8318 4.46742C18.0713 5.8393 18.0713 7.93343 16.8318 9.30531L16.7039 9.44007L10.4119 15.7311C10.0884 16.0546 9.85387 16.2917 9.62188 16.4821L9.3875 16.6588C9.18236 16.799 8.96432 16.9196 8.73711 17.0192L8.50762 17.1119C8.32585 17.1785 8.13845 17.2266 7.92168 17.2711L4.76348 17.8053C4.46916 17.8552 4.10835 17.875 3.81426 17.7907C3.59124 17.695 3.40749 17.5271 3.2918 17.316C3.1596 17.0209 3.18138 16.5674 3.23125 16.2731L3.76445 13.1149C3.85797 12.7108 4.01738 12.2985 4.37774 11.6491L4.55352 11.4147C4.74395 11.1825 4.98173 10.9484 5.30547 10.6246L11.5965 4.33265L11.7313 4.20472ZM6.2459 11.5651C5.89673 11.9142 5.71261 12.0998 5.58672 12.2526C5.38197 12.5358 5.23516 12.8327 5.17363 12.9869C5.1025 13.2125 5.06817 13.3815 4.94121 14.0983L4.54277 16.4918L6.93828 16.0944C7.65508 15.9684 7.82408 15.9341 8.04961 15.8629C8.35464 15.7349 8.63652 15.5602 8.78399 15.4498C8.93677 15.3239 9.12233 15.1398 9.47149 14.7907L14.4588 9.80238L11.2332 6.57679L6.2459 11.5651ZM15.7635 5.27308C14.9282 4.43776 13.6058 4.38573 12.7098 5.11683L12.1736 5.63636L15.4002 8.86195L15.9197 8.32581C16.6016 7.48961 16.6016 6.28311 15.9197 5.44691L15.7635 5.27308Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "plus") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path
          d="M9.33496 16.5V10.665H3.5C3.13273 10.665 2.83496 10.3673 2.83496 10C2.83496 9.63273 3.13273 9.33496 3.5 9.33496H9.33496V3.5C9.33496 3.13273 9.63273 2.83496 10 2.83496C10.3673 2.83496 10.665 3.13273 10.665 3.5V9.33496H16.5C16.8673 9.33496 17.165 9.63273 17.165 10C17.165 10.3673 16.8673 10.665 16.5 10.665H10.665V16.5C10.665 16.8673 10.3673 17.165 10 17.165C9.63273 17.165 9.33496 16.8673 9.33496 16.5Z"
          fill="currentColor"
        />
      </svg>
    );
  }
  if (name === "restore") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="M6.1664 8.80845C6.7325 8.80845 7.1918 9.26774 7.1918 9.83384V13.3338C7.19155 13.6236 6.9562 13.8592 6.6664 13.8592C6.37672 13.8591 6.14126 13.6235 6.14101 13.3338V10.5936L2.70547 14.0379C2.50071 14.243 2.16753 14.2435 1.9623 14.0389C1.75709 13.8342 1.75665 13.501 1.96133 13.2957L5.39101 9.85923H2.6664C2.37672 9.85909 2.14126 9.6235 2.14101 9.33384C2.14101 9.04397 2.37657 8.80858 2.6664 8.80845H6.1664Z" fill="currentColor" />
        <path d="M13.2943 1.96274C13.4989 1.75743 13.8311 1.75731 14.0365 1.96177C14.2419 2.16637 14.243 2.49854 14.0385 2.70395L10.6127 6.14145H13.3334C13.6233 6.14145 13.8588 6.37689 13.8588 6.66684C13.8587 6.95674 13.6233 7.19223 13.3334 7.19223H9.8334C9.26734 7.19223 8.80807 6.73288 8.80801 6.16684V2.66684C8.80801 2.37689 9.04345 2.14145 9.3334 2.14145C9.62335 2.14145 9.85879 2.37689 9.85879 2.66684V5.41098L13.2943 1.96274Z" fill="currentColor" />
      </svg>
    );
  }
  const statusPath =
    "M2.54004 0C3.94284 0 5.08008 1.13724 5.08008 2.54004C5.08008 3.71238 4.28484 4.69567 3.20508 4.98828V10.0908C4.28496 10.3833 5.08008 11.3676 5.08008 12.54C5.08008 13.9428 3.94284 15.0801 2.54004 15.0801C1.13724 15.0801 0 13.9428 0 12.54C0 11.3676 0.795113 10.3833 1.875 10.0908V4.98828C0.795239 4.69567 0 3.71238 0 2.54004C0 1.13724 1.13724 0 2.54004 0ZM2.54004 11.3301C1.87177 11.3301 1.33008 11.8718 1.33008 12.54C1.33008 13.2083 1.87177 13.75 2.54004 13.75C3.2083 13.75 3.75 13.2083 3.75 12.54C3.75 11.8718 3.2083 11.3301 2.54004 11.3301ZM2.54004 1.33008C1.87177 1.33008 1.33008 1.87177 1.33008 2.54004C1.33008 3.2083 1.87177 3.75 2.54004 3.75C3.2083 3.75 3.75 3.2083 3.75 2.54004C3.75 1.87177 3.2083 1.33008 2.54004 1.33008Z";
  if (name === "merge") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <g transform="translate(2.87695 2.45996)">
          <path d={`${statusPath} M12.917 10.04C12.917 9.37188 12.3751 8.83025 11.707 8.83008C11.0388 8.83008 10.4971 9.37177 10.4971 10.04C10.4971 10.7083 11.0388 11.25 11.707 11.25C12.3751 11.2498 12.917 10.7082 12.917 10.04ZM3.81055 4.73633C4.22936 5.91905 4.89909 6.81802 5.75879 7.48242C6.72602 8.22983 7.9664 8.70627 9.42676 8.9248C9.83996 8.08166 10.7048 7.5 11.707 7.5C13.1097 7.50018 14.2471 8.63734 14.2471 10.04C14.2471 11.4427 13.1097 12.5799 11.707 12.5801C10.3687 12.5801 9.2737 11.5448 9.17578 10.2314C7.57006 9.98395 6.12118 9.44292 4.94629 8.53516C4.25331 7.99967 3.66805 7.34453 3.20508 6.56836V10.0908H1.875V4.98828C2.59363 4.79363 3.18666 4.29138 3.50586 3.63379L3.81055 4.73633Z`} fill="currentColor" />
        </g>
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <g transform="translate(2.87695 2.45996)">
        <path d={statusPath} fill="currentColor" />
        <path
          d="M12.123 9.375C12.4903 9.375 12.7881 9.67277 12.7881 10.04V11.458H14.207V12.7881H12.7881V14.207C12.7879 14.5742 12.4902 14.8721 12.123 14.8721C11.756 14.8719 11.4582 14.574 11.458 14.207V12.7881H10.04C9.67277 12.7881 9.375 12.4903 9.375 12.123C9.37518 11.7559 9.67288 11.458 10.04 11.458H11.458V10.04C11.458 9.67288 11.7559 9.37518 12.123 9.375Z"
          fill="currentColor"
        />
      </g>
    </svg>
  );
}

function SummaryGlyph({ name }: { name: SummaryGlyphName }) {
  const path = {
    branch:
      "M4 2.5v7.25A2.25 2.25 0 0 0 6.25 12h3.5M4 2.5a1.25 1.25 0 1 0 0 .01M11 4.25a1.25 1.25 0 1 0 0 .01M11 5.5v4M11 12a1.25 1.25 0 1 0 0 .01",
    changes:
      "M2.75 3.25h10.5v9.5H2.75v-9.5Zm2.5 2.5h5.5M5.25 8h5.5m-5.5 2.25h3",
    commit:
      "M2.25 8h3.5M10.25 8h3.5M8 5.75A2.25 2.25 0 1 1 8 10.25 2.25 2.25 0 0 1 8 5.75Z",
    computer:
      "M2.25 3.25h11.5v7.5H2.25v-7.5Zm3 10h5.5M8 10.75v2.5",
    github:
      "M8 2.25a5.75 5.75 0 0 0-1.82 11.2c.29.05.39-.13.39-.28v-1.1c-1.63.35-1.97-.69-1.97-.69-.27-.68-.65-.86-.65-.86-.53-.36.04-.35.04-.35.59.04.9.6.9.6.52.9 1.36.64 1.69.49.05-.38.2-.64.37-.79-1.3-.15-2.67-.65-2.67-2.9 0-.64.23-1.16.6-1.57-.06-.15-.26-.74.06-1.54 0 0 .49-.16 1.58.6A5.5 5.5 0 0 1 8 4.54c.49 0 .97.07 1.43.2 1.1-.75 1.58-.6 1.58-.6.32.8.12 1.39.06 1.54.38.41.6.93.6 1.57 0 2.25-1.37 2.75-2.68 2.89.21.18.4.54.4 1.09v1.94c0 .15.1.33.4.27A5.75 5.75 0 0 0 8 2.25Z",
    globe:
      "M8 1.75a6.25 6.25 0 1 0 0 12.5A6.25 6.25 0 0 0 8 1.75Zm0 0c1.55 1.7 2.35 3.78 2.35 6.25S9.55 12.55 8 14.25C6.45 12.55 5.65 10.47 5.65 8S6.45 3.45 8 1.75ZM2 8h12",
    link:
      "M6.25 9.75 9.75 6.25M5.25 11.75H4A2.75 2.75 0 0 1 4 6.25h2M10.75 4.25H12a2.75 2.75 0 1 1 0 5.5h-2",
  }[name];
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <path d={path} />
    </svg>
  );
}

const configuredHookSettingsEntries: readonly HookSettingsEntry[] = [
  {
    command: "pnpm check",
    enabled: true,
    event: "Stop",
    handler: "command",
    id: "user-stop-check",
    source: "user",
    statusMessage: "Checking the workspace",
    timeout: "120s",
    trusted: true,
  },
  {
    changedSinceTrusted: true,
    command: "pnpm lint",
    enabled: false,
    event: "PreToolUse",
    handler: "command",
    id: "plugin-pre-tool-lint",
    matcher: "Shell",
    pluginName: "Quality checks",
    source: "plugin",
    trusted: false,
  },
  {
    enabled: true,
    event: "SessionStart",
    handler: "prompt",
    id: "project-session-context",
    managed: true,
    projectLabel: "codex-ui-kit",
    prompt: "Load the project contribution guide.",
    source: "project",
    trusted: true,
  },
];

const currentWorktreeSettingsEntry: ManagedWorktreeEntry = {
  id: "managed-a1b2",
  projectPath: "/Users/demo/Developer/codex-ui-kit",
  projectTextValue: "/Users/demo/Developer/codex-ui-kit",
  worktreePath: "/Users/demo/.codex/worktrees/a1b2/codex-ui-kit",
};

const currentWorktreeSettingsConversationEntry: ManagedWorktreeEntry = {
  ...currentWorktreeSettingsEntry,
  conversations: [
    {
      id: "worktree-settings-conversation",
      label: "Continue current-build UI parity",
    },
  ],
};

function DemoVsCodeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16">
      <rect fill="#2588d8" height="14" rx="3" width="14" x="1" y="1" />
      <path
        d="m4.2 8 2.4-2.2L11.8 3v10L6.6 10.2 4.2 8Zm2.4 0 3.3 2V6L6.6 8Z"
        fill="#fff"
      />
    </svg>
  );
}

function DemoShortcutClearIcon() {
  return (
    <svg
      aria-hidden="true"
      fill="currentColor"
      height="20"
      viewBox="0 0 20 20"
      width="20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M10.6299 1.33496C12.0335 1.33496 13.2695 2.25996 13.666 3.60645L13.8809 4.33496H17L17.1338 4.34863C17.4369 4.41057 17.665 4.67858 17.665 5C17.665 5.32142 17.4369 5.58943 17.1338 5.65137L17 5.66504H16.6543L15.8574 14.9912C15.7177 16.629 14.3478 17.8877 12.7041 17.8877H7.2959C5.75502 17.8877 4.45439 16.7815 4.18262 15.2939L4.14258 14.9912L3.34668 5.66504H3C2.63273 5.66504 2.33496 5.36727 2.33496 5C2.33496 4.63273 2.63273 4.33496 3 4.33496H6.11914L6.33398 3.60645L6.41797 3.3584C6.88565 2.14747 8.05427 1.33496 9.37012 1.33496H10.6299ZM5.46777 14.8779L5.49121 15.0537C5.64881 15.9161 6.40256 16.5576 7.2959 16.5576H12.7041C13.6571 16.5576 14.4512 15.8275 14.5322 14.8779L15.3193 5.66504H4.68164L5.46777 14.8779ZM7.66797 12.8271V8.66016C7.66797 8.29299 7.96588 7.99528 8.33301 7.99512C8.70028 7.99512 8.99805 8.29289 8.99805 8.66016V12.8271C8.99779 13.1942 8.70012 13.4912 8.33301 13.4912C7.96604 13.491 7.66823 13.1941 7.66797 12.8271ZM11.002 12.8271V8.66016C11.002 8.29289 11.2997 7.99512 11.667 7.99512C12.0341 7.9953 12.332 8.293 12.332 8.66016V12.8271C12.3318 13.1941 12.0339 13.491 11.667 13.4912C11.2999 13.4912 11.0022 13.1942 11.002 12.8271ZM9.37012 2.66504C8.60726 2.66504 7.92938 3.13589 7.6582 3.83789L7.60938 3.98145L7.50586 4.33496H12.4941L12.3906 3.98145C12.1607 3.20084 11.4437 2.66504 10.6299 2.66504H9.37012Z" />
    </svg>
  );
}

const currentLearnChatGptFavicon =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAPFBMVEVHcEwAgPcAevf3/P8AgPcAgPgAgPcAgPgAgPcAgPcAdPdgpvrh8P682f10s/uJvfsbjPjS5v44lvmjy/yT3YB9AAAACnRSTlMA////i0ydF8rrN2iBHgAAAXxJREFUOI2FU9uuwzAIa6BNWgK5/v+/HnKruk5H42GaigO242zbXe6w52XMddrDbd/ldm2uuuwb4nbzqv0D4s5335jzgTjmN9B6QI77/GxTEIlPlPuYDx5ZJGMMMRR4bln8sBoig8gZ0Q/E/lhAIgSmohQiiBjhXmJHP2CBwBiAirKpSGuE6/4kHZsIK1ERxGASjyWXGxKJ2TeA1+HZR+SSA0ypdghIpU9AxppIqSyadmsaQQQ6AEMKzIHAZ5l+bo0CZKEyVihBFer1d+i4tu5RzTpBoM8lDIKeIg8dHWCKfknTnzZHKfoptK9QEljIqNeK0+NGaUzA1UkaSIxZ2atAnIAsMEjatUMFQp/RAX7qtDMLiQup0eo0JAXk9m8aNaw2OhFSKAR6XcmwTJ/U6nHbek4SNBLZEwRcmbH3dbf1WRhjz0T9yNQ+8xhqjcwxygrDDMwd6RbGEjNLWP0V7JmpgdI83cl279i/6o7974fz++k1iH0+3q/2/8//D5sDEe8GCH/bAAAAAElFTkSuQmCC";

function CurrentMcpLink({ href }: { href: string }) {
  return (
    <a
      className="demo-current-mcp-answer__link"
      data-inline-mention-interactive=""
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      <span
        className="demo-current-mcp-answer__favicon-container"
        data-markdown-copy="exclude"
      >
        <img
          alt=""
          className="demo-current-mcp-answer__favicon"
          decoding="async"
          draggable={false}
          src={currentLearnChatGptFavicon}
        />
      </span>
      <span>{href}</span>
    </a>
  );
}

function CurrentMcpAnswer({
  current26820 = false,
  current26825 = false,
  recovery = false,
}: {
  current26820?: boolean;
  current26825?: boolean;
  recovery?: boolean;
}) {
  const href = recovery && !current26825
    ? "https://learn.chatgpt.com/docs/mcp-server"
    : "https://learn.chatgpt.com/docs/extend/mcp";
  return (
    <div
      className="demo-current-mcp-answer"
      data-markdown-text-style="assistant-message"
    >
      <p>
        {current26825 ? (
          <>
            CURRENT MCP 26.825 {recovery ? "RECOVERY" : "SUCCESS"} — Model
            Context Protocol — <CurrentMcpLink href={href} />
          </>
        ) : current26820 ? (
          <>
            {recovery
              ? "Use Codex with the Agents SDK"
              : "Model Context Protocol"}
            <br />
            <CurrentMcpLink href={href} />
          </>
        ) : recovery ? (
          <>
            RECOVERY COMPLETE
            <br />
            Use Codex with the Agents SDK
            <br />
            <CurrentMcpLink href={href} />
          </>
        ) : (
          <>
            Model Context Protocol — <CurrentMcpLink href={href} />
          </>
        )}
      </p>
    </div>
  );
}

function querySelection() {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("scenario");
  const scenarioId = isScenarioId(requested)
    ? requested
    : "streaming-recovery";
  const frame = params.get("frame");
  const capture = params.get("capture") === "1";
  const currentSidebar = params.get("currentSidebar") === "1";
  const requestedSidebarState = params.get("sidebarState");
  const sidebarState = [
    "compact-collapsed",
    "compact-pinned",
    "hidden",
    "account-menu",
    "help-menu",
    "project-collapsed",
    "project-menu",
    "collection-empty",
    "collection-loading",
    "collection-long-list",
    "status-lifecycle",
    "thread-lifecycle-current",
    "worktree-lifecycle-current",
  ].includes(requestedSidebarState ?? "")
    ? requestedSidebarState
    : null;
  const requestedSummaryState = params.get("summaryState");
  const summaryState = ["floating", "hidden", "pinned"].includes(
    requestedSummaryState ?? "",
  )
    ? (requestedSummaryState as "floating" | "hidden" | "pinned")
    : null;
  const layoutMode =
    params.get("layout") === "wide"
      ? ("wide" as const)
      : params.get("layout") === "narrow"
        ? ("narrow" as const)
        : undefined;
  const view: DemoView =
    params.get("view") === "pull-request"
      ? "pull-request"
      : params.get("view") === "projects"
        ? "projects"
        : params.get("view") === "shell"
          ? "shell"
          : params.get("view") === "workspace"
            ? "workspace"
            : "conversation";
  const theme = resolveDemoThemePreference(params.get("theme"), view);
  const requestedShellState = params.get("shellState");
  const shellState: AppRouteOutletStatus = [
    "ready",
    "loading",
    "empty",
    "error",
    "offline",
    "reconnecting",
    "stale",
  ].includes(requestedShellState ?? "")
    ? (requestedShellState as AppRouteOutletStatus)
    : "ready";
  return {
    capture,
    currentSidebar,
    frame,
    layoutMode,
    scenarioId,
    shellState,
    sidebarState,
    summaryState,
    theme,
    view,
  };
}

function isNarrowDemoWindow() {
  const rootFontSize =
    Number.parseFloat(
      window.getComputedStyle(document.documentElement).fontSize,
    ) || 16;
  return window.innerWidth <= 45 * rootFontSize;
}

function replayState(
  events: readonly ProtocolEventRecord[],
  count: number,
): DemoProtocolState {
  return events
    .slice(0, count)
    .reduce(reduceProtocolNotification, initialProtocolState);
}

const conversationHostFrames = new Set([
  "composer-attachment",
  "composer-auto-continued",
  "composer-disabled",
  "composer-idle",
  "composer-goal",
  "composer-multiline",
  "composer-plan",
  "composer-permissions-menu",
  "composer-queue-paused",
  "composer-queued",
  "composer-resources-menu",
  "composer-running",
  "conversation-thinking-current-26-825",
  "thread-scroll-away",
  "thread-windowed",
  "thread-current-26-825-middle",
  "thread-current-26-825-compact-away",
]);

const currentWindowedHistorySize = 82;
const currentWindowedTurnWindowSize = 7;
const currentWindowedInitialIndex = 39;
const current26825LongHistorySize = 30;
const current26825LongMiddleIndex = 14;
const current26825LongCompactIndex = 23;
const current26825LongReturnIndex = 27;

function current26825LongThreadFrame(frame: string | null) {
  return (
    frame === "thread-current-26-825-middle" ||
    frame === "thread-current-26-825-compact-away"
  );
}

function initialWindowedMessageIndex(frame: string | null) {
  if (frame === "thread-current-26-825-middle") {
    return current26825LongMiddleIndex;
  }
  if (frame === "thread-current-26-825-compact-away") {
    return current26825LongCompactIndex;
  }
  return currentWindowedInitialIndex;
}

function replayCountForSelection(
  scenario: ReplayScenario,
  frame: string | null,
) {
  if (frame && frame in scenario.frames) return scenario.frames[frame];
  if (
    scenario.id === "streaming-recovery" &&
    frame?.startsWith("sidebar-current")
  ) {
    return scenario.frames.recovered ?? scenario.events.length;
  }
  if (
    scenario.id === "attachment-lifecycle" &&
    frame?.startsWith("attachment-")
  ) {
    return 0;
  }
  if (isSubagentScenarioId(scenario.id) && frame) {
    const state = frame.includes("mixed")
      ? "mixed"
      : frame.includes("running")
        ? "running"
        : "completed";
    const prefix =
      scenario.id === "subagent-delegation"
        ? "subagent-current"
        : scenario.id === "subagent-concurrency"
          ? "subagent-concurrent"
          : "subagent-nested";
    return scenario.frames[`${prefix}-${state}`] ?? scenario.events.length;
  }
  if (
    scenario.id === "compaction" &&
    frame === "context-compaction-command-menu"
  ) {
    return (
      scenario.frames["context-compaction-ready"] ?? scenario.events.length
    );
  }
  if (scenario.id !== "conversation-lifecycle" || !frame) {
    return scenario.events.length;
  }
  if (!conversationHostFrames.has(frame)) return scenario.events.length;
  if (
    frame === "conversation-thinking-current-26-825"
  ) {
    return scenario.frames[frame] ?? scenario.events.length;
  }
  if (
    frame === "composer-running" ||
    frame === "composer-queued" ||
    frame === "composer-auto-continued"
  ) {
    return scenario.frames["conversation-running"] ?? scenario.events.length;
  }
  return (
    scenario.frames["conversation-thread-ready"] ?? scenario.events.length
  );
}

function isSubagentScenarioId(id: ReplayScenarioId) {
  return (
    id === "subagent-delegation" ||
    id === "subagent-concurrency" ||
    id === "subagent-nested" ||
    id === "subagent-recovery"
  );
}

function currentSubagentFrame(frame: string | null) {
  return frame?.startsWith("subagent-") ?? false;
}

function currentSubagentSummaryFrame(frame: string | null) {
  return frame?.includes("-summary-") ?? false;
}

function currentSubagentPanelFrame(frame: string | null) {
  return (
    (frame?.includes("-panel-") ?? false) ||
    (frame?.includes("-transcript-") ?? false) ||
    frame === "subagent-current-transcript" ||
    frame === "subagent-current-compact-820" ||
    frame === "subagent-current-compact-720"
  );
}

function currentWorkspacePersistenceFrame(frame: string | null) {
  return (
    frame === "workspace-persisted-thread" ||
    frame === "workspace-directory-missing"
  );
}

function initialSubagentId(frame: string | null) {
  if (frame === "subagent-current-transcript") return "long-probe";
  if (frame?.endsWith("transcript-alpha")) return "alpha";
  if (frame?.endsWith("transcript-beta")) return "beta";
  if (frame?.endsWith("transcript-parent")) return "parent";
  if (frame?.endsWith("transcript-child")) return "child";
  if (frame?.endsWith("transcript-validator")) return "validator";
  return null;
}

function compactSubagentTime(timestampMs: number, nowMs: number) {
  const elapsedMs = Math.max(0, nowMs - timestampMs);
  if (elapsedMs < 60_000) return `${Math.floor(elapsedMs / 1_000)}s`;
  if (elapsedMs < 3_600_000) return `${Math.floor(elapsedMs / 60_000)}m`;
  if (elapsedMs < 86_400_000) return `${Math.floor(elapsedMs / 3_600_000)}h`;
  return `${Math.floor(elapsedMs / 86_400_000)}d`;
}

function presentSubagent(
  subagent: DemoSubagent,
  mode: "live" | "replay",
  nowMs: number,
): SubagentItem {
  const timestampMs =
    subagent.status === "done"
      ? subagent.completedAtMs
      : subagent.startedAtMs;
  const relativeTime =
    mode === "live" && timestampMs !== null
      ? {
          timestamp: `${compactSubagentTime(timestampMs, nowMs)}${subagent.status === "done" ? " ago" : ""}`,
        }
      : {
          timestamp: subagent.status === "done" ? "1m ago" : "0s",
        };
  return {
    ...relativeTime,
    dateTime:
      mode !== "live" || timestampMs === null
        ? undefined
        : new Date(timestampMs).toISOString(),
    id: subagent.id,
    lastMessage: subagent.message ?? undefined,
    name: subagent.name ?? undefined,
    sortTimestampMs: timestampMs ?? undefined,
    status: subagent.status,
    statusSummary:
      subagent.status === "active"
        ? subagent.message ?? "Working"
        : subagent.status === "waiting"
          ? "Waiting"
          : subagent.message ?? undefined,
  };
}

function subagentActivityStatus(subagent: DemoSubagent) {
  if (
    subagent.threadStatus === "interrupted" ||
    subagent.threadStatus === "shutdown"
  ) {
    return "interrupted" as const;
  }
  if (subagent.status === "done") return "done" as const;
  if (subagent.activityKind === "interacted") return "updated" as const;
  return "active" as const;
}

function initialComposerValue(frame: string | null) {
  if (
    frame === "attachment-ready" ||
    frame === "attachment-multi-ready" ||
    frame === "attachment-native-ready"
  ) {
    return "Reply using three uppercase words describing this test: attachment, lifecycle, complete. Include a final period and no other text.";
  }
  if (frame === "context-compaction-command-menu") return "/compact";
  if (frame === "workspace-composer-current-26-825-multiline-long") {
    return Array.from(
      { length: 20 },
      (_, index) => `Current long Composer line ${index + 1}.`,
    ).join("\n");
  }
  if (
    frame === "composer-multiline" ||
    frame === "composer-permissions-menu" ||
    frame === "composer-resources-menu" ||
    frame === "workspace-composer-current-26-825-multiline-four"
  ) {
    return [
      "First current-build Composer line.",
      "Second line checks automatic growth.",
      "Third line keeps the draft unsubmitted.",
      "Fourth line reaches the measured expanded state.",
    ].join("\n");
  }
  if (frame === "composer-disabled") {
    return "Starting a deterministic lifecycle turn…";
  }
  return "";
}

type ComposerOverlay = "permissions" | "resources" | null;
type ComposerMode = Extract<ComposerModeKind, "goal" | "plan"> | null;

function initialComposerOverlay(frame: string | null): ComposerOverlay {
  if (
    frame === "composer-permissions-menu" ||
    frame === "workspace-composer-current-26-825-permissions"
  ) {
    return "permissions";
  }
  if (
    frame === "composer-resources-menu" ||
    frame === "workspace-composer-current-26-825-resources"
  ) {
    return "resources";
  }
  return null;
}

type CurrentQueue26825Phase =
  | "continued"
  | "paused"
  | "pending"
  | "resume-ready"
  | "resumed"
  | "settled"
  | null;

function initialCurrentQueue26825Phase(
  frame: string | null,
): CurrentQueue26825Phase {
  const prefix = "workspace-composer-current-26-825-queue-";
  if (!frame?.startsWith(prefix)) return null;
  const phase = frame.slice(prefix.length);
  return [
    "continued",
    "paused",
    "pending",
    "resume-ready",
    "resumed",
    "settled",
  ].includes(phase)
    ? (phase as Exclude<CurrentQueue26825Phase, null>)
    : "pending";
}

function initialComposerMode(frame: string | null): ComposerMode {
  if (
    frame === "composer-goal" ||
    frame === "workspace-composer-current-26-825-goal"
  ) {
    return "goal";
  }
  if (
    frame === "composer-plan" ||
    frame === "workspace-composer-current-26-825-plan"
  ) {
    return "plan";
  }
  return null;
}

const attachmentPreviewDataUrl =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlS8AAAAASUVORK5CYII=";
const currentAttachmentProductPreviewUrl = new URL(
  "../tests/visual/baselines/shell-notification-success-stack.png",
  import.meta.url,
).href;

function currentMarkdownMediaSource(source: string) {
  if (source.includes("openai.com/favicon.ico")) {
    return currentMarkdownOpenAiMediaFavicon;
  }
  return source.includes("current-markdown-preview.png")
    ? currentAttachmentProductPreviewUrl
    : source;
}

function currentMarkdownMediaStatus(source: string) {
  return source.includes("codex-ui-kit-missing.png") ||
    source.includes("codex-ui-kit-current-media.png")
    ? ("unavailable" as const)
    : ("ready" as const);
}

type DemoComposerAttachmentStatus =
  | "error"
  | "preview-error"
  | "ready"
  | "uploading";

interface DemoComposerAttachmentItem {
  id: string;
  kind: "file" | "folder" | "image";
  label: string;
  layout: "card" | "image";
  meta?: string;
  previewSrc?: string;
  progress?: number;
  status: DemoComposerAttachmentStatus;
}

function attachmentItemsForFrame(
  frame: string | null,
): DemoComposerAttachmentItem[] {
  if (
    frame === "attachment-current-post-picker" ||
    frame === "attachment-current-preview"
  ) {
    return [
      {
        id: "current-product-text",
        kind: "file",
        label: "codex-ui-kit-attachment-evidence.txt",
        layout: "card",
        meta: "TXT",
        status: "ready",
      },
      {
        id: "current-product-image",
        kind: "image",
        label: "shell-notification-success-stack.png",
        layout: "image",
        previewSrc: currentAttachmentProductPreviewUrl,
        status: "ready",
      },
    ];
  }
  if (frame === "composer-attachment" || frame === "attachment-ready") {
    return [
      {
        id: "current-image",
        kind: "image",
        label: "codex-ui-kit-current.png",
        layout: "image",
        previewSrc: attachmentPreviewDataUrl,
        status: "ready",
      },
    ];
  }
  if (frame === "attachment-preview-error") {
    return [
      {
        id: "preview-error",
        kind: "image",
        label: "reference-unavailable.png",
        layout: "image",
        status: "preview-error",
      },
    ];
  }
  const status: DemoComposerAttachmentStatus =
    frame === "attachment-uploading"
      ? "uploading"
      : frame === "attachment-upload-error"
        ? "error"
        : "ready";
  if (
    frame === "attachment-multi-ready" ||
    frame === "attachment-multi-compact" ||
    frame === "attachment-uploading" ||
    frame === "attachment-upload-error"
  ) {
    return [
      {
        id: "readme",
        kind: "file",
        label: "README.md",
        layout: "card",
        meta: "MD",
        status: "ready",
      },
      {
        id: "source-folder",
        kind: "folder",
        label: "src",
        layout: "card",
        meta: "Folder",
        status: "ready",
      },
      {
        id: "archive",
        kind: "file",
        label: "current-build.zip",
        layout: "card",
        meta: "ZIP",
        progress: status === "uploading" ? 62 : undefined,
        status,
      },
      {
        id: "notes",
        kind: "file",
        label: "notes.txt",
        layout: "card",
        meta: "TXT · 1–24",
        status: "ready",
      },
      {
        id: "manifest",
        kind: "file",
        label: "package.json",
        layout: "card",
        meta: "JSON",
        status: "ready",
      },
    ];
  }
  return [];
}

const composerPermissionOptions: readonly ComposerPermissionOption[] = [
  {
    description:
      "Always ask to edit external files and use the internet",
    icon: "○",
    id: "ask",
    label: "Ask for approval",
  },
  {
    description:
      "Only ask for actions detected as potentially unsafe",
    icon: "○",
    id: "approve",
    label: "Approve for me",
  },
  {
    description:
      "Unrestricted access to the internet and any file on your computer",
    icon: "◉",
    id: "full",
    label: "Full access",
  },
];

const currentComposerPermissionOptions: readonly ComposerPermissionOption[] = [
  {
    description: "Always ask to edit external files and use the internet",
    icon: <CurrentBuildIcon name="composer-permission-ask" />,
    id: "ask",
    label: "Ask for approval",
  },
  {
    description: "Only ask for actions detected as potentially unsafe",
    icon: <CurrentBuildIcon name="composer-permission" />,
    id: "approve",
    label: "Approve for me",
  },
  {
    description:
      "Unrestricted access to the internet and any file on your computer",
    icon: <CurrentBuildIcon name="composer-permission" />,
    id: "full",
    label: "Full access",
  },
];

function CurrentComposerResourceIcon({
  name,
}: {
  name: "files" | "goal" | "plan" | "skill";
}) {
  if (name === "files") {
    return (
      <svg aria-hidden="true" viewBox="0 0 21 21">
        <path d="M4.43945 12.8041V7.68261C4.43945 7.30642 4.74446 7.00141 5.12066 7.00141C5.49685 7.00141 5.80186 7.30642 5.80186 7.68261V12.8041C5.80186 15.2565 7.78984 17.2445 10.2422 17.2445C12.6945 17.2445 14.6825 15.2565 14.6825 12.8041V5.9751C14.6823 4.46587 13.4589 3.24247 11.9497 3.24229C10.4403 3.24229 9.21606 4.46576 9.21588 5.9751V12.8041C9.21588 13.3708 9.67553 13.8304 10.2422 13.8304C10.8088 13.8304 11.2685 13.3708 11.2685 12.8041V7.68261C11.2685 7.30642 11.5735 7.00141 11.9497 7.00141C12.3257 7.00159 12.6309 7.30653 12.6309 7.68261V12.8041C12.6309 14.1232 11.5612 15.1929 10.2422 15.1929C8.92314 15.1929 7.85347 14.1232 7.85347 12.8041V5.9751C7.85365 3.71337 9.68791 1.87988 11.9497 1.87988C14.2113 1.88006 16.0447 3.71348 16.0449 5.9751V12.8041C16.0449 16.0089 13.4469 18.6069 10.2422 18.6069C7.03745 18.6069 4.43945 16.0089 4.43945 12.8041Z" />
      </svg>
    );
  }
  if (name === "goal") {
    return (
      <svg aria-hidden="true" viewBox="0 0 20 20">
        <path d="M9.96861 1.91681C10.3002 1.91681 10.569 2.18564 10.569 2.51722C10.5688 2.84865 10.3001 3.11764 9.96861 3.11764C6.14529 3.11779 3.04595 6.21713 3.04579 10.0404C3.04597 13.8637 6.14531 16.964 9.96861 16.9641C13.792 16.9641 16.8921 13.8638 16.8923 10.0404C16.8925 9.709 17.1612 9.44003 17.4927 9.44003C17.8241 9.44019 18.093 9.7091 18.0931 10.0404C18.0929 14.527 14.4552 18.165 9.96861 18.165C5.48215 18.1648 1.84515 14.5269 1.84497 10.0404C1.84513 5.55398 5.48214 1.91697 9.96861 1.91681Z" />
        <path d="M8.73428 5.4417C9.05275 5.34987 9.38553 5.53321 9.47752 5.85167C9.56932 6.17 9.38575 6.50275 9.06755 6.59491C7.60672 7.01688 6.53899 8.36477 6.53894 9.96021C6.53907 11.8943 8.10685 13.4629 10.0409 13.4631C11.6106 13.463 12.9407 12.429 13.385 11.0041C13.4838 10.6877 13.8206 10.5114 14.1371 10.61C14.4536 10.7087 14.6308 11.0455 14.5321 11.3621C13.9357 13.2742 12.1509 14.663 10.0409 14.663C7.44369 14.6628 5.33824 12.5574 5.33812 9.96021C5.33816 7.81571 6.77345 6.00809 8.73428 5.4417Z" />
        <path d="M13.8656 1.99087C14.3948 1.60393 15.1805 1.97721 15.1739 2.67063L15.1528 4.83776L17.319 4.8166L17.4539 4.82541C18.1023 4.92002 18.4014 5.73603 17.9115 6.22638L15.5046 8.63331C15.3075 8.83039 15.04 8.94171 14.7613 8.94189H12.2063L10.3936 10.7555C10.1591 10.9899 9.77811 10.9899 9.54364 10.7555C9.30989 10.521 9.30952 10.1407 9.54364 9.90643L11.0486 8.40144V5.22922C11.0486 4.95027 11.1591 4.68234 11.3563 4.48509L13.7633 2.07816L13.8656 1.99087ZM12.2495 5.29005V7.74107H14.6978L16.4136 6.02536L13.9414 6.05004L13.9643 3.57434L12.2495 5.29005Z" />
      </svg>
    );
  }
  if (name === "plan") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <path d="M8 3.52051C9.07134 3.52056 10.0951 3.86574 10.8574 4.54785C11.6273 5.23672 12.0976 6.24043 12.0977 7.48047C12.0977 8.72922 11.6209 9.58857 11.1914 10.2686C10.9702 10.6188 10.7891 10.8819 10.6494 11.1572C10.5171 11.4183 10.4482 11.6441 10.4482 11.877V12.4268C10.4482 13.1158 10.1861 13.7075 9.72559 14.1221C9.27069 14.5315 8.65733 14.7373 8 14.7373C7.34282 14.7373 6.73026 14.5313 6.27539 14.1221C5.81475 13.7075 5.55182 13.1159 5.55176 12.4268V11.877C5.55175 11.6441 5.48294 11.4183 5.35059 11.1572C5.21093 10.8818 5.02985 10.6189 4.80859 10.2686C4.37912 9.58855 3.90332 8.72928 3.90332 7.48047C3.90335 6.24047 4.37279 5.23672 5.14258 4.54785C5.90494 3.86581 6.9287 3.52055 8 3.52051ZM6.60156 12.4268C6.60162 12.8365 6.75133 13.1382 6.97754 13.3418C7.2095 13.5504 7.55861 13.6875 8 13.6875C8.44132 13.6874 8.79051 13.5504 9.02246 13.3418C9.24859 13.1382 9.39838 12.8364 9.39844 12.4268V12.2656H6.60156V12.4268ZM8 4.57129C7.14816 4.57133 6.38548 4.84457 5.84277 5.33008C5.30758 5.80896 4.95315 6.52253 4.95312 7.48047C4.95312 8.42985 5.30144 9.08283 5.69629 9.70801C5.88705 10.01 6.11776 10.3486 6.28711 10.6826C6.37163 10.8493 6.44704 11.0262 6.50293 11.2148H9.49707C9.55297 11.0262 9.62839 11.0262 9.71289 10.6826C9.88222 10.3487 10.113 10.01 10.3037 9.70801C10.6985 9.08286 11.0469 8.4298 11.0469 7.48047C11.0468 6.52258 10.6924 5.80896 10.1572 5.33008C9.61453 4.84459 8.8518 4.57134 8 4.57129Z" />
        <path d="M2 6.85449C2.28995 6.85449 2.52539 7.08993 2.52539 7.37988C2.52539 7.66983 2.28995 7.90527 2 7.90527H0.833008C0.543208 7.9051 0.308594 7.66972 0.308594 7.37988C0.308594 7.09004 0.543208 6.85467 0.833008 6.85449H2Z" />
        <path d="M15.167 6.85449C15.4568 6.85462 15.6924 7.09001 15.6924 7.37988C15.6924 7.66975 15.4568 7.90514 15.167 7.90527H14C13.7102 7.9051 13.4756 7.66972 13.4756 7.37988C13.4756 7.09004 13.7102 6.85467 14 6.85449H15.167Z" />
        <path d="M2.56348 1.94141C2.7685 1.73639 3.10161 1.7364 3.30664 1.94141L4.08203 2.71777C4.28706 2.9228 4.28706 3.25494 4.08203 3.45996C3.877 3.66497 3.54486 3.66498 3.33984 3.45996L2.56348 2.68457C2.35847 2.47955 2.35847 2.14643 2.56348 1.94141Z" />
        <path d="M12.6934 1.94141C12.8984 1.7364 13.2315 1.73643 13.4365 1.94141C13.6415 2.14643 13.6415 2.47955 13.4365 2.68457L12.6602 3.46094C12.4552 3.66539 12.1229 3.66538 11.918 3.46094C11.7129 3.25592 11.713 2.9228 11.918 2.71777L12.6934 1.94141Z" />
        <path d="M8 0.1875C8.28995 0.1875 8.52539 0.422941 8.52539 0.712891V1.87988C8.52521 2.16968 8.28984 2.4043 8 2.4043C7.71016 2.4043 7.47479 2.16968 7.47461 1.87988V0.712891C7.47461 0.422941 7.71005 0.1875 8 0.1875Z" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <g transform="scale(1.25)">
        <path d="M8.00195 4.1416C10.1326 4.14173 11.8602 5.86933 11.8604 8C11.8602 10.1307 10.1327 11.8583 8.00195 11.8584C5.87129 11.8582 4.14369 10.1307 4.14355 8C4.14373 5.86936 5.87131 4.14178 8.00195 4.1416Z" />
        <path d="M8.00195 1.47461C11.6056 1.47461 14.5273 4.39634 14.5273 8C14.5273 11.6037 11.6056 14.5254 8.00195 14.5254C4.3983 14.5254 1.47656 11.6037 1.47656 8C1.47656 4.39634 4.3983 1.47461 8.00195 1.47461ZM8.00195 2.52539C4.97819 2.52539 2.52734 4.97624 2.52734 8C2.52734 11.0238 4.97819 13.4746 8.00195 13.4746C11.0257 13.4746 13.4766 11.0238 13.4766 8C13.4766 4.97624 11.0257 2.52539 8.00195 2.52539Z" />
      </g>
    </svg>
  );
}

const currentComposerResourceGroups: readonly ComposerResourceGroup[] = [
  {
    id: "add",
    options: [
      { icon: <CurrentComposerResourceIcon name="files" />, id: "files", label: "Files and folders" },
      { icon: <span aria-hidden="true" className="demo-current-chrome-icon" />, id: "chrome", label: "Attach Google Chrome" },
      { description: "Choose project for new chats", icon: <CurrentBuildIcon name="composer-project" />, id: "project", label: "Work in a project" },
      { description: "Set a goal to keep pursuing", icon: <CurrentComposerResourceIcon name="goal" />, id: "goal", label: "Goal" },
      { description: "Turn plan mode on", icon: <CurrentComposerResourceIcon name="plan" />, id: "plan", label: "Plan mode" },
      { icon: <CurrentComposerResourceIcon name="skill" />, id: "record-skill", label: "Record a skill" },
    ],
  },
  {
    id: "plugins",
    label: "Plugins",
    options: [
      { icon: "◆", id: "figma", label: "Figma", description: "Figma design-to-code workflows" },
      { icon: "▤", id: "documents", label: "Documents", description: "Create and edit documents" },
      { icon: "▧", id: "pdf", label: "PDF", description: "Read, create, and verify PDFs" },
      { icon: "▦", id: "spreadsheets", label: "Spreadsheets", description: "Create and edit spreadsheets" },
      { icon: "▥", id: "presentations", label: "Presentations", description: "Create and edit presentations" },
    ],
  },
];

const composerResourceGroups: readonly ComposerResourceGroup[] = [
  {
    id: "add",
    options: [
      {
        icon: "＋",
        id: "files",
        label: "Files and folders",
      },
      {
        icon: "▣",
        id: "active-app",
        label: "Attach active app",
      },
      {
        description: "Choose project for new chats",
        icon: "□",
        id: "project",
        label: "Work in a project",
      },
      {
        description: "Set a goal to keep pursuing",
        icon: "◎",
        id: "goal",
        label: "Goal",
      },
      {
        description: "Turn plan mode on",
        icon: "◇",
        id: "plan",
        label: "Plan mode",
      },
      {
        icon: "◌",
        id: "record-skill",
        label: "Record a skill",
      },
    ],
  },
  {
    id: "plugins",
    label: "Plugins",
    options: [
      {
        description: "Create and edit document artifacts",
        icon: "▤",
        id: "documents",
        label: "Documents",
      },
      {
        description: "Read, create, and verify PDF files",
        icon: "▧",
        id: "pdf",
        label: "PDF",
      },
      {
        description: "Create and edit spreadsheet files",
        icon: "▦",
        id: "spreadsheets",
        label: "Spreadsheets",
      },
      {
        description: "Create and edit presentations",
        icon: "▥",
        id: "presentations",
        label: "Presentations",
      },
    ],
  },
  {
    id: "skills",
    label: "Skills",
    options: [
      { icon: "◎", id: "browser-control", label: "Browser control" },
      { icon: "◎", id: "chrome-control", label: "Chrome control" },
      { icon: "◎", id: "computer-use", label: "Computer use" },
      { icon: "◎", id: "image-generation", label: "Image generation" },
      { icon: "◎", id: "openai-docs", label: "OpenAI docs" },
      { icon: "◎", id: "watch-pr", label: "Watch pull request" },
      { icon: "◎", id: "visualize", label: "Visualize" },
      { icon: "◎", id: "site-builder", label: "Site builder" },
    ],
  },
  {
    id: "apps",
    label: "Apps",
    options: [
      { icon: "◫", id: "browser-app", label: "Browser" },
      { icon: "◫", id: "chrome-app", label: "Chrome" },
      { icon: "◫", id: "tasks-app", label: "Codex tasks" },
      { icon: "◫", id: "files-app", label: "Local files" },
      { icon: "◫", id: "terminal-app", label: "Terminal" },
      { icon: "◫", id: "electron-app", label: "Electron" },
      { icon: "◫", id: "github-app", label: "GitHub" },
    ],
  },
  {
    id: "context",
    label: "Context",
    options: [
      { icon: "⊕", id: "current-task", label: "Current task" },
      { icon: "⊕", id: "current-repository", label: "Current repository" },
      { icon: "⊕", id: "browser-tab", label: "Open browser tab" },
      { icon: "⊕", id: "recent-screenshot", label: "Recent screenshot" },
      { icon: "⊕", id: "clipboard", label: "Clipboard" },
    ],
  },
];

function initialQueuedPrompts(frame: string | null): QueuedPrompt[] {
  const currentQueuePhase = initialCurrentQueue26825Phase(frame);
  if (
    frame !== "composer-queued" &&
    frame !== "composer-queue-paused" &&
    !currentQueuePhase
  ) {
    return [];
  }
  if (currentQueuePhase === "continued" || currentQueuePhase === "settled") {
    return [];
  }
  return [
    {
      id: "queued-lifecycle-1",
      status: "queued",
      text: "Verify the queued Composer lifecycle.",
    },
  ];
}

function initialQueuedContinuation(frame: string | null) {
  return frame === "composer-auto-continued"
    ? "Verify the queued Composer lifecycle."
    : null;
}

const terminalLifecycleCommandIds = [
  "command-terminal-dev",
  "command-terminal-test",
  "command-terminal-docs",
] as const;

function currentTerminalFrame(frame: string | null) {
  return frame?.startsWith("terminal-current-") ?? false;
}

function currentTerminal26825Frame(frame: string | null) {
  return frame?.startsWith("terminal-current-26-825-") ?? false;
}

function initialTerminalSessionIds(
  scenarioId: ReplayScenarioId,
  frame: string | null,
) {
  if (scenarioId === "background-terminal") return ["command-dev"];
  if (scenarioId !== "terminal-lifecycle") return [];
  if (frame === "terminal-current-26-825-closed") return [];
  if (
    frame === "terminal-current-26-825-multi" ||
    frame === "terminal-current-26-825-compact" ||
    frame === "terminal-current-26-825-compact-sidebar"
  ) {
    return ["local-terminal-1", "local-terminal-2", "local-terminal-3"];
  }
  if (frame === "terminal-current-26-825-mismatch") {
    return ["local-terminal-1"];
  }
  if (frame === "terminal-current-closed") return [];
  if (frame === "terminal-current-background-list") return [];
  if (frame === "terminal-current-background-open") {
    return ["agent-background-terminal"];
  }
  if (frame === "terminal-current-multi") {
    return ["local-terminal-1", "local-terminal-2", "local-terminal-3"];
  }
  if (frame === "terminal-current-mismatch") {
    return ["local-terminal-1", "local-terminal-2"];
  }
  if (currentTerminalFrame(frame)) return ["local-terminal-1"];
  if (frame === "terminal-running") {
    return terminalLifecycleCommandIds.slice(0, 1);
  }
  if (frame === "terminal-failed") {
    return terminalLifecycleCommandIds.slice(0, 2);
  }
  if (frame === "terminal-closed") return [];
  return [...terminalLifecycleCommandIds];
}

function initialTerminalWorkspaceLabels(
  scenarioId: ReplayScenarioId,
  frame: string | null,
) {
  const sessionIds = initialTerminalSessionIds(scenarioId, frame);
  if (frame === "terminal-current-26-825-mismatch") {
    return { "local-terminal-1": "codex-ui-kit" };
  }
  if (frame === "terminal-current-mismatch") {
    return {
      "local-terminal-1": "assets",
      "local-terminal-2": "codex-ui-kit",
    };
  }
  return Object.fromEntries(
    sessionIds.map((sessionId) => [sessionId, "codex-ui-kit"]),
  );
}

function initialTerminalHistory(
  scenarioId: ReplayScenarioId,
  frame: string | null,
): Record<string, TerminalEntry[]> {
  if (scenarioId !== "terminal-lifecycle" || !currentTerminalFrame(frame)) {
    return {};
  }
  const sessionIds = initialTerminalSessionIds(scenarioId, frame);
  return Object.fromEntries(
    sessionIds.map((sessionId, index) => [
      sessionId,
      currentTerminal26825Frame(frame)
        ? frame === "terminal-current-26-825-running" && index === 0
          ? [
              {
                id: `${sessionId}:running-command`,
                kind: "command" as const,
                text: "JaminZhou@JaminZhou codex-ui-kit % sleep 3; printf 'CODEX_UI_KIT_TERMINAL_26_825_DONE\\n'",
              },
            ]
          : frame === "terminal-current-26-825-completed" && index === 0
            ? [
                {
                  id: `${sessionId}:completed-command`,
                  kind: "command" as const,
                  text: "JaminZhou@JaminZhou codex-ui-kit % sleep 3; printf 'CODEX_UI_KIT_TERMINAL_26_825_DONE\\n'",
                },
                {
                  id: `${sessionId}:completed-output`,
                  kind: "stdout" as const,
                  text: "CODEX_UI_KIT_TERMINAL_26_825_DONE",
                },
              ]
            : [
                {
                  id: `${sessionId}:current-prompt`,
                  kind: "command" as const,
                  text: "JaminZhou@JaminZhou codex-ui-kit %",
                },
                {
                  id: `${sessionId}:current-ready`,
                  kind: "stdout" as const,
                  text: "",
                },
              ]
        : frame === "terminal-current-background-open"
        ? Array.from({ length: 45 }, (_, outputIndex) => ({
            id: `${sessionId}:background:${outputIndex + 66}`,
            kind: "stdout" as const,
            text: `terminal-background-handle-${String(
              outputIndex + 66,
            ).padStart(3, "0")}`,
          }))
        : frame === "terminal-current-command-exit-7" && index === 0
          ? [
              {
                id: `${sessionId}:exit-command`,
                kind: "command" as const,
                text: "/workspace/codex-ui-kit % sh -c 'printf terminal-direct-out; exit 7'",
              },
              {
                id: `${sessionId}:exit-output`,
                kind: "stdout" as const,
                text: "terminal-direct-out",
              },
            ]
        : frame === "terminal-current-running" && index === 0
        ? [
            {
              id: `${sessionId}:running`,
              kind: "command" as const,
              text: "/workspace/codex-ui-kit % sleep 3; echo terminal-after-reopen",
            },
          ]
        : frame === "terminal-current-completed" && index === 0
          ? [
              {
                id: `${sessionId}:command`,
                kind: "command" as const,
                text: "/workspace/codex-ui-kit % sleep 3; echo terminal-after-reopen",
              },
              {
                id: `${sessionId}:stdout`,
                kind: "stdout" as const,
                text: "terminal-after-reopen",
              },
            ]
          : [
              {
                id: `${sessionId}:prompt`,
                kind: "command" as const,
                text: `/workspace/${
                  frame === "terminal-current-mismatch" && index === 0
                    ? "assets"
                    : "codex-ui-kit"
                } %`,
              },
              {
                id: `${sessionId}:ready`,
                kind: "stdout" as const,
                text: "",
              },
            ],
    ]),
  );
}

function initialClosedTerminalSessionIds(
  scenarioId: ReplayScenarioId,
  frame: string | null,
) {
  return scenarioId === "terminal-lifecycle" &&
    frame === "terminal-closed"
    ? [...terminalLifecycleCommandIds]
    : [];
}

function replayStatusLabel(
  status: DemoProtocolState["status"],
  running: boolean,
  stopped: boolean,
) {
  if (running) return "Working";
  if (stopped) return "Stopped";
  if (status === "retrying") return "Retrying";
  if (status === "running") return "Working";
  if (status === "completed") return "Completed";
  if (status === "interrupted") return "Stopped";
  if (status === "failed") return "Failed";
  return "Ready";
}

function interruptConversationReplay(
  state: DemoProtocolState,
): DemoProtocolState {
  if (!state.currentTurnId) return state;
  return reduceProtocolNotification(state, {
    atMs: state.eventCount,
    method: "turn/completed",
    params: {
      threadId: state.threadId,
      turn: {
        completedAt: 13,
        durationMs: 2_000,
        error: null,
        id: state.currentTurnId,
        items: [],
        itemsView: "full",
        startedAt: 11,
        status: "interrupted",
      },
    },
  });
}

function continueQueuedConversationReplay(
  state: DemoProtocolState,
  prompt: string,
): DemoProtocolState {
  const interrupted = interruptConversationReplay(state);
  const threadId =
    interrupted.threadId ?? "thread-conversation-lifecycle";
  const turnId = "turn-queued-continuation";
  const startAt = interrupted.eventCount;
  const continuationEvents: ProtocolEventRecord[] = [
    {
      atMs: startAt,
      method: "item/started",
      params: {
        item: {
          clientId: "demo-queued-continuation",
          content: [{ text: prompt, text_elements: [], type: "text" }],
          id: "user-queued-continuation",
          type: "userMessage",
        },
        startedAtMs: 13_000,
        threadId,
        turnId,
      },
    },
    {
      atMs: startAt + 1,
      method: "turn/started",
      params: {
        threadId,
        turn: {
          completedAt: null,
          durationMs: null,
          error: null,
          id: turnId,
          items: [],
          itemsView: "full",
          startedAt: 13,
          status: "inProgress",
        },
      },
    },
    {
      atMs: startAt + 2,
      method: "item/started",
      params: {
        item: {
          id: "assistant-queued-continuation",
          memoryCitation: null,
          phase: "final_answer",
          text: "",
          type: "agentMessage",
        },
        startedAtMs: 13_020,
        threadId,
        turnId,
      },
    },
    {
      atMs: startAt + 3,
      method: "item/agentMessage/delta",
      params: {
        delta: "Working on the queued follow-up…",
        itemId: "assistant-queued-continuation",
        threadId,
        turnId,
      },
    },
  ];
  return continuationEvents.reduce(
    reduceProtocolNotification,
    interrupted,
  );
}

function statusLabel(state: DemoProtocolState) {
  if (state.status === "retrying") return "Retrying";
  if (state.status === "running") return "Working";
  if (state.status === "completed") return "Completed";
  if (state.status === "interrupted") return "Stopped";
  if (state.status === "failed") return "Failed";
  return "Ready";
}

function McpResponseActions({
  copyLabel = "Copy response",
  includeFork = true,
  label = "MCP response actions",
  toolbar = true,
}: {
  copyLabel?: string;
  includeFork?: boolean;
  label?: string | null;
  toolbar?: boolean;
}) {
  return (
    <span
      aria-label={label ?? undefined}
      className="demo-mcp-turn-actions demo-turn-actions"
      role={toolbar ? "toolbar" : undefined}
    >
      <button aria-label={copyLabel} type="button">
        <CurrentBuildIcon name="thread-assistant-copy" />
      </button>
      <button aria-label="Good response" type="button">
        <CurrentBuildIcon name="thread-assistant-good" />
      </button>
      <button aria-label="Bad response" type="button">
        <CurrentBuildIcon name="thread-assistant-bad" />
      </button>
      {includeFork ? (
        <button aria-label="Fork chat from here" type="button">
          <CurrentBuildIcon name="thread-assistant-fork" />
        </button>
      ) : null}
    </span>
  );
}

function CurrentBrowserFailureLink() {
  return (
    <span className="demo-current-browser-failure-link">
      <svg aria-hidden="true" viewBox="0 0 16 16">
        <circle cx="8" cy="8" r="6.25" />
        <path d="M1.75 8h12.5M8 1.75c1.75 1.68 2.63 3.76 2.63 6.25S9.75 12.57 8 14.25C6.25 12.57 5.38 10.49 5.38 8S6.25 3.43 8 1.75Z" />
      </svg>
      <a href="https://openai.com/codex/">https://openai.com/codex/</a>
    </span>
  );
}

function CurrentBrowserFailurePrompt({ retry = false }: { retry?: boolean }) {
  if (!retry) {
    return (
      <>
        {"不要读取或修改本地文件，不要运行命令，不要使用 Web Search。仅使用 Browser 工具：打开 "}
        <CurrentBrowserFailureLink />
        {"，在页面中查找文本 desktop，然后只回复 BROWSER OPEN FIND DONE。若 Browser 失败，请明确返回错误，不要改用其他工具。"}
      </>
    );
  }
  return (
    <div className="demo-current-browser-failure-prompt">
      <span>Do not read or modify local files.</span>
      <span>Do not run commands.</span>
      <span>Do not use Web Search.</span>
      <span>Use only the Browser tool.</span>
      <span>Open this exact URL:</span>
      <CurrentBrowserFailureLink />
      <span>Find the text desktop in the page.</span>
      <span>Reply only BROWSER OPEN FIND DONE.</span>
      <span>
        If Browser fails, report the Browser error and do not use any other
        tool.
      </span>
    </div>
  );
}

// Public source: https://openai.com/favicon.ico, captured from the current
// Codex external-link renderer so visual acceptance stays deterministic.
const currentMarkdownOpenAiFavicon =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABEAAAARCAIAAAC0D9CtAAABFWlDQ1BfAAB4nJWQsUoDQRCGPyUgioWCpcV1gqDGBEMCIsScBttEIbG73B2HJjmPy4m+gY29rQ9haWFhZStYW/gAVqn9N1dsQFJkhtn9dvZnZ2dgEWOFIgzjLG01j51O99JZ+mZBPjHPHyXMNqnGX7n2c4f5bTkIR772X0WWqrieDMQbUc73hns5Pxq+y5JM/Gw4PW81xC/itWiKe1PsJ6nRv4sPh4Nb3/6b1TC+aGvvKDZpciOPGBCyR5s+V3gilxpF9mnIXerimtYDTnWuUOWEsqIqNreu2JW6LlVFUTLzzEsGD1DeVukVm7v+gdcnWP+wua2+vn0Eb12bszNOvNSz0x8XZvTk/OvJ4YwYn11RadJR5Q9AT0aJf0or6QAAAn9JREFUeJyUUztoWgEUrZpPTZMGQkhCAhUsJORXMoWQkM8QMiVKpsTBQZxEsA6CKSKCiINOCg6ikwjiIDrooAiKg4Ko4CBGB3+oET8YFMG/PfaFFEqH9g3vXS7n3nvuOffNrK+vf/jPZ+Y9IpFIq6uru7u7V1dXCJCp1+t+vz+ZTCKYTCa/kcSc2dnZ29tbPp9Pp9MRI0Mmk4Hr9/uZTEan0zmdzsFgQNRQFhcXAXp4eFAoFJubm4VCweFwBAKB4XCIPN5bW1uY3Gg0MHA8Hk9rlpaWGAwGChCk02mtVntxcQFuYrE4Eon4fL5wOHxzc3N2doZ2qVRqyu3g4MBisezt7RWLRb1ez2QwXyovZrP5/v4eybW1NZvNVqlUZDIZOrJYrFqtRsbS2AE9JBLJc/J54dOCwWDAkFAoZDQahd+FtC80oFutFmAAT1cFV/D2er0cDof+lY5UqVRSq9Xlcvno6Ojpx5Pb4242m71eb25uDuCp1qAOfUDs+PgYG0OcjY0NjUYDBJvNdrlcXC735OQEokMnwgMyISu2isfj19fXmAB9UYDhyIMkZES7RCIxGo3ePIVf+Jyfn6Mr6IpEIgjF4/GoVGoul0MxhUJ5bb6urKzAdAJMxlA0pn6kLn9ePj09VavU+Xx+fn4elGg0GgrgjMFouLu7A22Ap3PgFJze2dk5/HYITVVqVbVaBQ7eM5lMrIpDEQqFEC3565l6CtLtdvvy8hKawAqP2xONRk0mk0Ag2N7ettvtj4+P+/v7nU5HqVTGYrG3eyNuRyqVglKtWuv1e5gcDAZxGVAFS3a7XblcbrVaiZP7y41ib6xLqARQNpv940ZJ7//Pv/8LPwEAAP//uhbiMQAAAAZJREFUAwCcbFyQ5jiGKgAAAABJRU5ErkJggg==";

// Public source: https://openai.com/favicon.ico. This exact 48/32/16 ICO
// response keeps the current Markdown media acceptance deterministic.
const currentMarkdownOpenAiMediaFavicon =
  "data:image/x-icon;base64,AAABAAMAMDAAAAEAIABoJgAANgAAACAgAAABACAAKBEAAJ4mAAAQEAAAAQAgAGgEAADGNwAAKAAAADAAAABgAAAAAQAgAAAAAAAAJAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////I////5D////S////7f////r////9///////////////9////+v///+3////S////kP///yMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////EP///6D////v///////////////////////////////////////////////////////////////////////////////v////oP///xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///xL///+7/////f////////////////////////////////////////////////////////////////////////////////////////////////////3///+7////EgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////if////v/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+////4kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///xL////c///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////c////EgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////Mf////f/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////9////zEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///9F////+///////////////////////////////////////////////////////////////////////////n5+f/0BAQP8QEBD/AAAA/xAQEP9AQED/f39//+/v7/////////////////////////////////////////////////v///9FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///zH////7/////////////////////////////////////////////////////////////////////8/Pz/8gICD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/xAQEP+Pj4/////////////////////////////////////////////////7////MQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////Ev////f/////////////////////////////////////39/f/2BgYP8wMDD/AAAA/wAAAP8gICD/UFBQ/wAAAP8AAAD/ICAg/6CgoP/Pz8///////+/v7/+/v7//YGBg/wAAAP8AAAD/X19f////////////////////////////////////////////////9////xIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////3P///////////////////////////////9/f3/9gYGD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8QEBD/v7+//////////////////////////////////8/Pz/8gICD/AAAA/39/f////////////////////////////////////////////////9wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///+J////////////////////////////////39/f/yAgIP8AAAD/AAAA/2BgYP+/v7//7+/v///////f39//kJCQ/yAgIP8AAAD/AAAA/1BQUP/f39/////////////////////////////f39//EBAQ/wAAAP/f39////////////////////////////////////////////////+JAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///xL////7////////////////////////////////QEBA/wAAAP8gICD/39/f/////////////////////////////////+/v7/+AgID/EBAQ/wAAAP8QEBD/f39//+/v7///////////////////////kJCQ/wAAAP9gYGD////////////////////////////////////////////////7////EgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///7v///////////////////////////////+Pj4//AAAA/yAgIP/f39//////////////////////////////////////////////////7+/v/2BgYP8AAAD/AAAA/yAgIP+fn5//////////////////39/f/wAAAP8gICD/7+/v////////////////////////////////////////////////uwAAAAAAAAAAAAAAAAAAAAAAAAAA////EP////3///////////////////////////////8wMDD/AAAA/6CgoP//////////////////////39/f/2BgYP9wcHD/39/f//////////////////////+/v7//QEBA/wAAAP8AAAD/QEBA/////////////////zAwMP8AAAD/AAAA/2BgYP/f39///////////////////////////////////////f///xAAAAAAAAAAAAAAAAAAAAAA////oP///////////////////////////////9/f3/8AAAD/EBAQ//////////////////////9/f3//AAAA/wAAAP8AAAD/EBAQ/39/f//v7+///////////////////////5+fn/8AAAD/AAAA/9/f3////////////0BAQP8AAAD/AAAA/wAAAP8QEBD/z8/P/////////////////////////////////////6AAAAAAAAAAAAAAAAAAAAAA////7////////////////////////////////5+fn/8AAAD/UFBQ////////////n5+f/yAgIP8AAAD/AAAA/2BgYP9AQED/AAAA/wAAAP8gICD/r6+v//////////////////////8gICD/AAAA/9/f3////////////0BAQP8AAAD/n5+f/0BAQP8AAAD/EBAQ/9/f3////////////////////////////////+8AAAAAAAAAAAAAAAD///8j/////////////////////////////////////5+fn/8AAAD/YGBg/9/f3/8wMDD/AAAA/wAAAP8gICD/z8/P////////////v7+//0BAQP8AAAD/AAAA/0BAQP+/v7////////////8gICD/AAAA/9/f3////////////0BAQP8AAAD/v7+///////9wcHD/AAAA/yAgIP////////////////////////////////////8jAAAAAAAAAAD///+Q/////////////////////////////////////7CwsP8AAAD/EBAQ/wAAAP8AAAD/ICAg/6CgoP///////////////////////////39/f/8AAAD/AAAA/wAAAP8AAAD/b29v/+/v7/8gICD/AAAA/9/f3////////////0BAQP8AAAD/v7+/////////////ICAg/wAAAP+fn5////////////////////////////////+QAAAAAAAAAAD////S/////////////////////////////////////7+/v/8AAAD/AAAA/wAAAP+AgID/7+/v//////////////////////+fn5//ICAg/wAAAP8AAAD/YGBg/4CAgP8QEBD/AAAA/xAQEP8QEBD/AAAA/9/f3////////////0BAQP8AAAD/v7+/////////////n5+f/wAAAP9AQED////////////////////////////////SAAAAAAAAAAD////t////////////////////////////////39/f/yAgIP8AAAD/MDAw/9/f3///////////////////////39/f/zAwMP8AAAD/AAAA/zAwMP/f39/////////////f39//YGBg/wAAAP8AAAD/AAAA/9/f3////////////0BAQP8AAAD/v7+/////////////7+/v/wAAAP8AAAD////////////////////////////////tAAAAAAAAAAD////6////////////////////////////////QEBA/wAAAP9AQED//////////////////////9/f3/9gYGD/AAAA/wAAAP8AAAD/kJCQ/////////////////////////////////7+/v/8QEBD/AAAA/9/f3////////////0BAQP8AAAD/v7+//////////////////yAgIP8AAAD/39/f///////////////////////////6AAAAAAAAAAD////9//////////////////////////+/v7//AAAA/xAQEP/v7+//////////////////j4+P/yAgIP8AAAD/AAAA/wAAAP8AAAD/39/f//////////////////////////////////////8gICD/AAAA/9/f3////////////0BAQP8AAAD/v7+//////////////////yAgIP8AAAD/39/f///////////////////////////9AAAAAAAAAAD///////////////////////////////9wcHD/AAAA/4CAgP////////////////9AQED/AAAA/wAAAP9gYGD/39/f/yAgIP8AAAD/39/f//////////////////////////////////////8gICD/AAAA/9/f3///////n5+f/xAQEP8AAAD/z8/P////////////7+/v/wAAAP8QEBD/////////////////////////////////AAAAAAAAAAD///////////////////////////////8gICD/AAAA/7+/v/////////////////8AAAD/AAAA/5CQkP///////////yAgIP8AAAD/39/f//////////////////////////////////////8gICD/AAAA/7+/v/8gICD/AAAA/wAAAP9AQED/7+/v////////////gICA/wAAAP9AQED/////////////////////////////////AAAAAAAAAAD////9//////////////////////////8QEBD/AAAA/9/f3/////////////////8AAAD/AAAA/////////////////yAgIP8AAAD/39/f//////////////////////////////////////8gICD/AAAA/wAAAP8AAAD/ICAg/6CgoP/////////////////v7+//EBAQ/wAAAP+/v7/////////////////////////////////9AAAAAAAAAAD////6//////////////////////////8QEBD/AAAA/9/f3/////////////////8AAAD/AAAA/////////////////yAgIP8AAAD/b29v/+/v7////////////////////////////5+fn/8QEBD/AAAA/wAAAP+AgID///////////////////////////9QUFD/AAAA/0BAQP/////////////////////////////////////6AAAAAAAAAAD////t//////////////////////////9AQED/AAAA/7+/v/////////////////8AAAD/AAAA/////////////////yAgIP8AAAD/AAAA/xAQEP+Pj4////////////+fn5//ICAg/wAAAP8AAAD/YGBg/9/f3///////////////////////39/f/yAgIP8AAAD/ICAg/9/f3//////////////////////////////////////tAAAAAAAAAAD////S//////////////////////////9wcHD/AAAA/2BgYP////////////////8AAAD/AAAA/////////////////yAgIP8AAAD/MDAw/wAAAP8AAAD/MDAw/1BQUP8AAAD/AAAA/yAgIP+vr6///////////////////////9/f3/9gYGD/AAAA/wAAAP8AAAD/oKCg///////////////////////////////////////////SAAAAAAAAAAD///+Q///////////////////////////f39//AAAA/wAAAP/f39////////////8AAAD/AAAA/////////////////yAgIP8AAAD/39/f/7+/v/8gICD/AAAA/wAAAP8AAAD/gICA////////////////////////////f39//yAgIP8AAAD/AAAA/yAgIP8AAAD/gICA//////////////////////////////////////////+QAAAAAAAAAAD///8j////////////////////////////////cHBw/wAAAP8gICD/39/f//////8AAAD/AAAA/////////////////yAgIP8AAAD/39/f////////////gICA/xAQEP8AAAD/AAAA/39/f//v7+///////5+fn/8gICD/AAAA/wAAAP9gYGD/39/f/4CAgP8AAAD/YGBg//////////////////////////////////////////8jAAAAAAAAAAAAAAAA////7////////////////////////////////zAwMP8AAAD/EBAQ/39/f/8AAAD/AAAA/////////////////yAgIP8AAAD/39/f/////////////////+/v7/9gYGD/AAAA/wAAAP8QEBD/QEBA/wAAAP8AAAD/ICAg/6CgoP///////////3BwcP8AAAD/gICA/////////////////////////////////////+8AAAAAAAAAAAAAAAAAAAAA////oP///////////////////////////////+/v7/9AQED/AAAA/wAAAP8AAAD/AAAA/////////////////zAwMP8AAAD/UFBQ/9/f3///////////////////////v7+//0BAQP8AAAD/AAAA/yAgIP+QkJD//////////////////////zAwMP8AAAD/r6+v/////////////////////////////////////6AAAAAAAAAAAAAAAAAAAAAA////EP////3/////////////////////////////////////n5+f/0BAQP8AAAD/AAAA/8/Pz////////////5CQkP8QEBD/AAAA/xAQEP9/f3//7+/v//////////////////////+fn5//cHBw/9/f3///////////////////////v7+//wAAAP8QEBD/7+/v/////////////////////////////////f///xAAAAAAAAAAAAAAAAAAAAAAAAAAAP///7v///////////////////////////////////////////////9gYGD/AAAA/5+fn//////////////////v7+//cHBw/wAAAP8AAAD/EBAQ/5+fn//////////////////////////////////////////////////f39//ICAg/wAAAP+AgID/////////////////////////////////////uwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///xL////7//////////////////////////////////////////+wsLD/AAAA/yAgIP///////////////////////////7+/v/9AQED/AAAA/wAAAP9AQED/v7+//////////////////////////////////9/f3/8gICD/AAAA/zAwMP/v7+/////////////////////////////////7////EgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///+J////////////////////////////////////////////////ICAg/wAAAP9/f3//////////////////////////////////n5+f/yAgIP8AAAD/AAAA/0BAQP+fn5//v7+//7+/v/+fn5//UFBQ/wAAAP8AAAD/ICAg/9/f3/////////////////////////////////////+JAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////3P//////////////////////////////////////////39/f/xAQEP8AAAD/b29v/+/v7////////////////////////////8/Pz/8gICD/AAAA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP9wcHD/7+/v/////////////////////////////////////9wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////Ev////f//////////////////////////////////////////8/Pz/8QEBD/AAAA/xAQEP9wcHD/r6+v/7+/v/+vr6//YGBg/yAgIP8AAAD/AAAA/4CAgP9gYGD/QEBA/0BAQP9QUFD/kJCQ/9/f3///////////////////////////////////////////9////xIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///zH////7///////////////////////////////////////////f39//QEBA/wAAAP8AAAD/AAAA/wAAAP8AAAD/AAAA/wAAAP8gICD/39/f///////////////////////////////////////////////////////////////////////////7////MQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///9F////+////////////////////////////////////////////////7+/v/9wcHD/UFBQ/0BAQP9AQED/cHBw/7+/v/////////////////////////////////////////////////////////////////////////////////v///9FAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////Mf////f/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////9////zEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///xL////c///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////c////EgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////if////v/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+////4kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///xL///+7/////f////////////////////////////////////////////////////////////////////////////////////////////////////3///+7////EgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////EP///6D////v///////////////////////////////////////////////////////////////////////////////v////oP///xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////I////5D////S////7f////r////9///////////////9////+v///+3////S////kP///yMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAgAAAAQAAAAAEAIAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8V////J////yv///8s////LP///yv///8n////FQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wL///9e////mv///9f////5//////////////////////////n////X////mv///17///8CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wf///9S////zP////v/////////////////////////////////////////////////////////+////8z///9S////BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8h////tv////////////////////////////////////////////////////////////////////////////////////////+2////IQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////NP///9X///////////////////////////////////////////v7+//X19f/ysrK/9DQ0P/p6en////////////////////////////////V////NAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///zP////l///////////////////////////////////////////Gxsb/R0dH/wwMDP8AAAD/BAQE/ygoKP+AgID/8/Pz///////////////////////////l////MwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8e////1v////////////////v7+/+/v7//V1dX/xoaGv8UFBT/Pj4+/xAQEP8vLy//ra2t/9ra2v/Ozs7/fX19/xgYGP9PT0//8fHx///////////////////////////W////HgAAAAAAAAAAAAAAAAAAAAAAAAAA////Cf///7b////////////////19fX/Y2Nj/wMDA/8/Pz//iIiI/5eXl/9iYmL/DQ0N/zU1Nf+vr6//////////////////2NjY/x8fH/9ubm7///////////////////////////////+2////CQAAAAAAAAAAAAAAAAAAAAD///9S/////v///////////Pz8/35+fv8HBwf/n5+f//X19f/////////////////MzMz/UVFR/w4ODv9WVlb/zc3N////////////oKCg/xUVFf/k5OT///////////////////////////7///9SAAAAAAAAAAAAAAAA////BP///83////////////////c3Nz/ERER/4ODg////////////+7u7v+bm5v/0dHR////////////s7Oz/zk5Of8SEhL/e3t7//7+/v/n5+f/FhYW/0NDQ/+1tbX//////////////////////////83///8EAAAAAAAAAAD///9d////+v///////////////6Wlpf8NDQ3/7u7u//r6+v+zs7P/JSUl/w8PD/8PDw//d3d3/+fn5///////9vb2/3Fxcf8FBQX/6Ojo//T09P8qKir/ERER/wkJCf+Ojo7/////////////////////+v///10AAAAAAAAAAP///5r/////////////////////f39//zU1Nf/Dw8P/RERE/wQEBP9eXl7/xcXF/5aWlv8dHR3/KCgo/5SUlP/+/v7/vr6+/w0NDf/l5eX/8/Pz/yQkJP+Ojo7/lpaW/woKCv+fn5//////////////////////mgAAAAD///8V////1/////////////////////+YmJj/BQUF/wcHB/87Ozv/t7e3////////////09PT/z4+Pv8EBAT/ExMT/0hISP9+fn7/EBAQ/+Xl5f/z8/P/IyMj/5aWlv//////V1dX/y0tLf/u7u7////////////////X////Ff///yf////5////////////////8vLy/05OTv8UFBT/mJiY//n5+f//////6enp/2tra/8RERH/QUFB/8TExP/Ly8v/U1NT/wEBAf8RERH/5ubm//Pz8/8jIyP/k5OT///////IyMj/BAQE/83Nzf////////////////n///8n////K/////////////////////99fX3/CgoK/8TExP//////9fX1/5WVlf8WFhb/AAAA/2lpaf/5+fn////////////9/f3/ioqK/wsLC//m5ub/9/f3/yUlJf+SkpL//////+np6f8LCwv/srKy/////////////////////yv///8s////////////////7e3t/yoqKv9xcXH//////+Dg4P9AQED/Dw8P/3p6ev8VFRX/lpaW//////////////////////+2trb/Dg4O/+jo6P+7u7v/BQUF/5ycnP//////2tra/wMDA//ExMT/////////////////////LP///yz////////////////R0dH/BAQE/729vf//////v7+//wAAAP+wsLD//////x0dHf+VlZX//////////////////////7i4uP8MDAz/Wlpa/wYGBv9ERET/2dnZ//////90dHT/HBwc/+Xl5f////////////////////8s////K////////////////87Ozv8AAAD/zc3N//////+/v7//AAAA/+3t7f/8/Pz/ICAg/1paWv/r6+v////////////29vb/fX19/wAAAP8gICD/qqqq//n5+f//////x8fH/w4ODv9+fn7//////////////////////////yv///8n////+f//////////3d3d/xYWFv+ioqL//////7+/v/8AAAD/6enp//z8/P8nJyf/BAQE/x8fH/+lpaX/sbGx/y4uLv8UFBT/gYGB/+zs7P//////7+/v/5OTk/8ODg7/SUlJ//Ly8v/////////////////////5////J////xX////X///////////5+fn/SUlJ/zIyMv/+/v7/xsbG/wAAAP/p6en//Pz8/x4eHv9zc3P/dHR0/woKCv8AAAD/OTk5/9DQ0P///////Pz8/6qqqv81NTX/CAgI/w0NDf95eXn//////////////////////////9f///8VAAAAAP///5r////////////////Hx8f/Dw8P/2lpaf+goKD/AAAA/+np6f/8/Pz/Ghoa/5qamv//////v7+//0lJSf8GBgb/bGxs/7a2tv9MTEz/AgIC/1FRUf/R0dH/SUlJ/1xcXP//////////////////////////mgAAAAAAAAAA////Xf////r///////////////+urq7/FhYW/w0NDf8BAQH/6Ojo//7+/v8oKCj/QUFB/9zc3P///////v7+/6Ghof8mJib/BgYG/zc3N/+2trb/+fn5//X19f8eHh7/iIiI//////////////////////r///9dAAAAAAAAAAD///8E////zf/////////////////////Y2Nj/b29v/wkJCf/BwcH//////6ioqP8yMjL/FRUV/4eHh//t7e3//////+zs7P+srKz/7+/v////////////kZGR/woKCv/Ozs7/////////////////////zf///wQAAAAAAAAAAAAAAAD///9S/////v/////////////////////6+vr/MjIy/11dXf///////////+3t7f+AgID/Dw8P/ywsLP+np6f/9fX1////////////8/Pz/5+fn/8GBgb/cXFx//z8/P////////////////7///9SAAAAAAAAAAAAAAAAAAAAAP///wn///+2//////////////////////////+dnZ3/DAwM/6Ghof/////////////////Z2dn/S0tL/wAAAP80NDT/b29v/21tbf8zMzP/BgYG/2pqav/09PT/////////////////////tv///wkAAAAAAAAAAAAAAAAAAAAAAAAAAP///x7////W//////////////////////////+NjY3/Dw8P/0VFRf+dnZ3/tLS0/4eHh/8uLi7/FBQU/2RkZP9CQkL/Pz8//3BwcP/Dw8P//////////////////////////9b///8eAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///zP////l//////////////////////////+rq6v/Pz8//xsbG/8RERH/Hx8f/1FRUf/MzMz////////////////////////////////////////////////l////MwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///zT////V///////////////////////////4+Pj/4ODg/9ra2v/k5OT/////////////////////////////////////////////////////1f///zQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///yH///+2/////////////////////////////////////////////////////////////////////////////////////////7b///8hAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///wf///9S////zP////v/////////////////////////////////////////////////////////+////8z///9S////BwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD///8C////Xv///5r////X////+f/////////////////////////5////1////5r///9e////AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///xX///8n////K////yz///8s////K////yf///8VAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///xD///9E////V////1f///9E////EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA////D////4D////f/////////////////////////+H///+A////DwAAAAAAAAAAAAAAAAAAAAAAAAAA////H////8f////////////////d3d3/l5eX/6Wlpf/09PT//////////8f///8fAAAAAAAAAAAAAAAA////D////8n/////tbW1/2pqav9nZ2f/MDAw/52dnf+mpqb/Z2dn/+zs7P//////////yf///w8AAAAAAAAAAP///4H/////wsLC/2lpaf/h4eH/0NDQ/66urv9qamr/v7+//7e3t/93d3f/9/f3//////////+BAAAAAP///xH////j/////4CAgP+fn5//dnZ2/2VlZf+CgoL/zs7O/15eXv/Ly8v/OTk5/3Jycv/39/f/////5P///xH///9E//////////9iYmL/YWFh/8nJyf+fn5//SUlJ/2lpaf9FRUX/xsbG/4aGhv+YmJj/p6en//////////9E////WP/////FxcX/d3d3/9bW1v9hYWH/Pz8///r6+v/6+vr/ZGRk/6ampv98fHz/yMjI/4qKiv//////////WP///1j/////kpKS/76+vv+Dg4P/qqqq/2FhYf/t7e3/9/f3/0lJSf9fX1//1dXV/3h4eP/BwcH//////////1j///9E/////7a2tv+NjY3/iIiI/8TExP9OTk7/Y2Nj/z09Pf+dnZ3/yMjI/2BgYP9aWlr///////////////9E////Ef///+T6+vr/fX19/y4uLv/Jycn/YmJi/8nJyf+UlJT/YWFh/3Z2dv+pqan/d3d3///////////j////EQAAAAD///+B//////7+/v+Li4v/nZ2d/9LS0v9ra2v/nJyc/8rKyv/c3Nz/aWlp/7u7u///////////gQAAAAAAAAAA////D////8n/////9fX1/3BwcP+NjY3/mpqa/zMzM/9tbW3/cnJy/7i4uP//////////yf///w8AAAAAAAAAAAAAAAD///8f////x//////9/f3/s7Oz/6SkpP/h4eH/////////////////////x////x8AAAAAAAAAAAAAAAAAAAAAAAAAAP///w////+A////4P/////////////////////////f////gP///w8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP///xD///9E////V////1f///9E////EAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";

const currentCitationQueries = [
  'site:developers.openai.com/codex/guides "AGENTS.md"',
  'site:developers.openai.com/codex "AGENTS.override.md"',
  'site:developers.openai.com/codex "project_doc_fallback_filenames"',
  "site:developers.openai.com/codex AGENTS.md",
  "site:openai.com AGENTS.md Codex",
] as const;

function CurrentCitationAnswer() {
  return (
    <div className="demo-current-citations-answer">
      <ul>
        <li>
          <code>AGENTS.md</code> guides Codex on repository structure, testing,
          and conventions.{" "}
          <CitationMention
            faviconSrc={currentMarkdownOpenAiFavicon}
            href="https://openai.com/index/introducing-codex/"
            label="OpenAI"
          />
        </li>
        <li>
          Its scope covers its directory tree; deeper files take precedence.{" "}
          <CitationMention
            faviconSrc={currentMarkdownOpenAiFavicon}
            href="https://openai.com/index/introducing-codex/"
            label="OpenAI"
          />
        </li>
        <li>
          Codex loads instructions from $CODEX_HOME, then project root through
          the working directory.{" "}
          <CitationMention
            faviconSrc={currentMarkdownOpenAiFavicon}
            href="https://openai.com/index/unrolling-the-codex-agent-loop/"
            label="OpenAI"
          />
        </li>
      </ul>
      <p>CITATION_SOURCES_READY</p>
    </div>
  );
}

function CurrentMarkdownCodeLanguageIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20">
      <path d="M4.46951 6.27289C4.68734 5.97727 5.10354 5.91356 5.3992 6.13129C5.69464 6.34921 5.75762 6.76637 5.53982 7.06195L3.32791 10.0639L5.5369 13.0131C5.75668 13.3071 5.69695 13.7237 5.40311 13.9438C5.10923 14.1637 4.69261 14.1037 4.47244 13.81L2.04178 10.5639C1.82214 10.2704 1.8206 9.86789 2.03787 9.57269L4.46951 6.27289Z" />
      <path d="M14.6053 6.13129C14.9009 5.9136 15.3171 5.97728 15.5349 6.27289L17.9666 9.57269C18.1837 9.86787 18.1823 10.2705 17.9627 10.5639L15.532 13.81C15.312 14.1038 14.8953 14.1635 14.6013 13.9438C14.3074 13.7237 14.2476 13.3071 14.4676 13.0131L16.6765 10.0639L14.4646 7.06195C14.2468 6.76628 14.3096 6.34915 14.6053 6.13129Z" />
      <path d="M11.0584 6.37347C11.2205 6.04395 11.6194 5.90772 11.949 6.06976C12.2782 6.23191 12.4135 6.63003 12.2517 6.95941L8.94119 13.6928C8.77923 14.0222 8.381 14.1581 8.05154 13.9965C7.72196 13.8345 7.58577 13.4355 7.74783 13.1059L11.0584 6.37347Z" />
    </svg>
  );
}

function CurrentMarkdownCodeWrapIcon() {
  return (
    <svg
      aria-hidden="true"
      className="codex-ui-code-block__wrap-icon"
      viewBox="0 0 20 20"
    >
      <path d="M10.0002 12.6685C10.3674 12.6686 10.6653 12.9663 10.6653 13.3335V16.6665C10.6653 17.0337 10.3674 17.3314 10.0002 17.3315C9.63297 17.3315 9.33521 17.0338 9.33521 16.6665V13.3335C9.33521 12.9662 9.63297 12.6685 10.0002 12.6685Z" />
      <path d="M13.6956 7.02979C13.9553 6.77009 14.3773 6.77009 14.637 7.02979L16.9592 9.35303C17.3166 9.71036 17.3166 10.2906 16.9592 10.6479L14.637 12.9712C14.3772 13.2305 13.9551 13.2307 13.6956 12.9712C13.436 12.7116 13.4363 12.2895 13.6956 12.0298L15.0598 10.6655H3.33325C2.96615 10.6655 2.66848 10.3675 2.66821 10.0005C2.66821 9.63322 2.96598 9.33545 3.33325 9.33545H15.0598L13.6956 7.97119C13.436 7.71164 13.4363 7.28952 13.6956 7.02979Z" />
      <path d="M10.0002 2.66846C10.3674 2.66859 10.6653 2.96631 10.6653 3.3335V6.6665C10.6653 7.03369 10.3674 7.33141 10.0002 7.33154C9.63297 7.33154 9.33521 7.03377 9.33521 6.6665V3.3335C9.33521 2.96623 9.63297 2.66846 10.0002 2.66846Z" />
    </svg>
  );
}

function CurrentMarkdownCodeCopyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="demo-current-markdown-code-copy-icon"
      viewBox="0 0 20 20"
    >
      <path
        clipRule="evenodd"
        d="M15.1006 1.78516C16.793 1.78556 18.165 3.15808 18.165 4.85059V10.8838C18.1649 12.5762 16.7929 13.9478 15.1006 13.9482H13.998V15.0508C13.9976 16.7431 12.626 18.1151 10.9336 18.1152H4.90039C3.20789 18.1152 1.83537 16.7432 1.83496 15.0508V9.01758C1.83496 7.32482 3.20764 5.95215 4.90039 5.95215H6.00195V4.85059C6.00195 3.15783 7.37463 1.78516 9.06738 1.78516H15.1006ZM4.90039 7.28223C3.94218 7.28223 3.16504 8.05936 3.16504 9.01758V15.0508C3.16544 16.0087 3.94243 16.7852 4.90039 16.7852H10.9336C11.8914 16.785 12.6676 16.0086 12.668 15.0508V9.01758C12.668 8.05945 11.8917 7.28237 10.9336 7.28223H4.90039ZM9.06738 3.11523C8.10917 3.11523 7.33203 3.89237 7.33203 4.85059V5.95215H10.9336C12.6262 5.95229 13.998 7.32491 13.998 9.01758V12.6182H15.1006C16.0584 12.6178 16.8348 11.8416 16.835 10.8838V4.85059C16.835 3.89262 16.0585 3.11564 15.1006 3.11523H9.06738Z"
        fillRule="evenodd"
      />
    </svg>
  );
}

function CurrentMarkdownExternalLink({
  children,
  node: _node,
  ...linkProps
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  children?: ReactNode;
  node?: unknown;
}) {
  return (
    <a
      {...linkProps}
      className="demo-current-markdown-link"
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="demo-current-markdown-link__mention">
        <span aria-hidden="true" className="demo-current-markdown-link__icon">
          <img alt="" src={currentMarkdownOpenAiFavicon} />
        </span>
        <span>{children}</span>
      </span>
    </a>
  );
}

function CurrentMarkdownTaskCheckbox({
  checked,
}: {
  checked?: boolean;
  node?: unknown;
  type?: string;
}) {
  return (
    <button
      aria-checked={checked ?? false}
      aria-label={checked ? "Completed task" : "Incomplete task"}
      className="demo-current-markdown-task"
      disabled
      role="checkbox"
      type="button"
    >
      {checked ? (
        <svg aria-hidden="true" viewBox="0 0 14 14">
          <path d="M3.2 7.1 5.6 9.4 10.7 4.4" />
        </svg>
      ) : null}
    </button>
  );
}

const currentMarkdownCodeCopyLabel = <CurrentMarkdownCodeCopyIcon />;
const currentMarkdownCodeLanguageIcon = <CurrentMarkdownCodeLanguageIcon />;
const currentMarkdownCodeWrapIcon = <CurrentMarkdownCodeWrapIcon />;
const currentMarkdownComponents = {
  a: CurrentMarkdownExternalLink,
  input: CurrentMarkdownTaskCheckbox,
};
const currentMarkdownLanguageLabels = { ts: "TypeScript" };

const pullRequestFiles = [
  {
    additions: 31,
    change: "modified" as const,
    deletions: 0,
    lines: [
      {
        content:
          "@@ -136,8 +137,31 @@ export type TerminalSessionStatus",
        kind: "hunk" as const,
      },
      {
        content: '| "idle"',
        kind: "context" as const,
        newLineNumber: 140,
        oldLineNumber: 140,
      },
      {
        content: '| "restoring"',
        kind: "addition" as const,
        newLineNumber: 141,
      },
      {
        content: '| "running";',
        kind: "context" as const,
        newLineNumber: 142,
        oldLineNumber: 141,
      },
      {
        content: "const terminalSessionStatusLabel = {",
        kind: "addition" as const,
        newLineNumber: 144,
      },
    ],
    path: "src/components/TerminalPanel.tsx",
  },
  {
    additions: 7,
    change: "modified" as const,
    deletions: 0,
    lines: [
      {
        content: "@@ -16,6 +17,7 @@ export type ReplayScenarioId",
        kind: "hunk" as const,
      },
      {
        content: '| "terminal-lifecycle"',
        kind: "addition" as const,
        newLineNumber: 20,
      },
      {
        content: '| "interruption"',
        kind: "context" as const,
        newLineNumber: 21,
        oldLineNumber: 20,
      },
      {
        content: '"terminal-lifecycle": scenario(',
        kind: "addition" as const,
        newLineNumber: 84,
      },
    ],
    path: "playgrounds/codex-app/src/replay.ts",
  },
  {
    additions: 140,
    change: "modified" as const,
    deletions: 0,
    lines: [
      {
        content:
          '@@ -87,4 +89,140 @@ describe("terminal panel", () => {',
        kind: "hunk" as const,
      },
      {
        content:
          'it("coordinates multiple controlled sessions, close, create, and restore", () => {',
        kind: "addition" as const,
        newLineNumber: 92,
      },
    ],
    path: "tests/terminal-panel.test.tsx",
  },
];

const workspaceProjects = [
  {
    icon: <SidebarGlyph name="folder" />,
    id: "codex-ui-kit",
    label: "codex-ui-kit",
    path: "/workspace/codex-ui-kit",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "app-server-client",
    label: "codex-app-server-client",
    path: "/workspace/codex-app-server-client",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "desktop-shell",
    label: "desktop-shell",
    path: "/workspace/desktop-shell",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "tooling",
    label: "tooling",
    path: "/workspace/tooling",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "component-lab",
    label: "component-lab",
    path: "/workspace/component-lab",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "desktop-client",
    label: "desktop-client",
    path: "/workspace/desktop-client",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "design-system",
    label: "design-system",
    path: "/workspace/design-system",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "release-tools",
    label: "release-tools",
    path: "/workspace/release-tools",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "protocol-kit",
    label: "protocol-kit",
    path: "/workspace/protocol-kit",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "test-fixtures",
    label: "test-fixtures",
    path: "/workspace/test-fixtures",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "documentation",
    label: "documentation",
    path: "/workspace/documentation",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "automation",
    label: "automation",
    path: "/workspace/automation",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "sample-app",
    label: "sample-app",
    path: "/workspace/sample-app",
    status: "available" as const,
  },
  {
    icon: <SidebarGlyph name="folder" />,
    id: "shared-utils",
    label: "shared-utils",
    path: "/workspace/shared-utils",
    status: "available" as const,
  },
];

const workspaceNewProjectOptionId = "workspace:new-project";
const workspaceNoProjectOptionId = "workspace:no-project";

const currentProjectIndexUpdated = [
  "2m",
  "1h",
  "3h",
  "10h",
  "1d",
  "3d",
  "1w",
  "2w",
  "3w",
  "1mo",
  "1mo",
  "2mo",
  "3mo",
  "4mo",
];

const currentProjectIndexItems = workspaceProjects.map((project, index) => ({
  id: project.id,
  label: project.label,
  path: project.path,
  recentChats:
    index === 0
      ? [
          {
            id: "project-index-parity",
            label: "Match the current projects index",
            meta: "2m",
          },
        ]
      : index === 1
        ? [
            {
              id: "sidebar-contract",
              label: "Verify sidebar project behavior",
              meta: "1h",
            },
          ]
        : [],
  status: "available" as const,
  updated: currentProjectIndexUpdated[index] ?? "4mo",
  updatedOrder: workspaceProjects.length - index,
}));

const workspaceEnvironmentGroups = [
  {
    description: "Current checkout and linked worktrees",
    id: "codex-ui-kit",
    items: [
      {
        branch: "main",
        id: "main",
        label: "Main",
        meta: "clean",
        status: "available" as const,
      },
      {
        branch: "feat/coding-workspace-lifecycle",
        id: "feature",
        label: "Coding workspace",
        meta: "ready",
        status: "available" as const,
      },
      {
        actions: (
          <button aria-label="Inspect repairing worktree" type="button">
            Details
          </button>
        ),
        branch: "fix/repair",
        id: "repairing",
        label: "Repairing worktree",
        status: "repairing" as const,
        statusLabel: "Repairing",
      },
    ],
    label: "codex-ui-kit",
  },
];

type WorkspaceBranch = {
  branch: string;
  checkedOutInLinkedWorktree?: boolean;
  checkoutUnavailable?: boolean;
  id: string;
  label: string;
  meta?: string;
  status: "available" | "repairing";
  statusLabel?: string;
};

type WorkspaceGitBranchResponse =
  | { branch: string; ok: true }
  | { code: string; message: string; ok: false };

type WorkspaceHostBranchState =
  | { status: "loading" }
  | {
      branches: string[];
      branchesCheckedOutElsewhere: string[];
      branchesUnavailableForCheckout: string[];
      currentBranch: string | null;
      status: "ready";
      unbornBranch: string | null;
    }
  | { message: string; status: "error" };

function workspaceGitBranchId(branch: string) {
  return branch === "main" ? "main" : `git:${branch}`;
}

function workspaceGitBranch(
  branch: string,
  branchesCheckedOutElsewhere: ReadonlySet<string>,
  branchesUnavailableForCheckout: ReadonlySet<string>,
): WorkspaceBranch {
  const checkedOutInLinkedWorktree = branchesCheckedOutElsewhere.has(branch);
  const checkoutUnavailable = branchesUnavailableForCheckout.has(branch);
  return {
    branch,
    checkedOutInLinkedWorktree,
    checkoutUnavailable,
    id: workspaceGitBranchId(branch),
    label: branch,
    meta: checkedOutInLinkedWorktree
      ? "Linked worktree"
      : checkoutUnavailable
        ? "Unavailable"
        : "clean",
    status: "available",
  };
}

const unattachedWorkspaceBranchId = "state:unattached-head";

function unattachedWorkspaceBranch(
  unbornBranch: string | null,
): WorkspaceBranch {
  const label = unbornBranch ? `${unbornBranch} (unborn)` : "Detached HEAD";
  return {
    branch: label,
    id: unattachedWorkspaceBranchId,
    label,
    meta: "unattached",
    status: "available",
  };
}

const workspaceBranches: WorkspaceBranch[] = [
  {
    branch: "main",
    id: "main",
    label: "Main",
    meta: "clean",
    status: "available" as const,
  },
  {
    branch: "feat/current-workspace-entry-refresh",
    id: "feature",
    label: "Workspace entry refresh",
    meta: "ready",
    status: "available" as const,
  },
  {
    branch: "fix/context-layout",
    id: "context-layout",
    label: "Context layout",
    meta: "ready",
    status: "available" as const,
  },
  {
    branch: "docs/parity-notes",
    id: "parity-notes",
    label: "Parity notes",
    meta: "clean",
    status: "available" as const,
  },
  {
    branch: "test/electron-workspace",
    id: "electron-workspace",
    label: "Electron workspace",
    meta: "clean",
    status: "available" as const,
  },
  {
    branch: "refactor/context-controls",
    id: "context-controls",
    label: "Context controls",
    meta: "clean",
    status: "available" as const,
  },
  {
    branch: "chore/current-baseline",
    id: "current-baseline",
    label: "Current baseline",
    meta: "clean",
    status: "available" as const,
  },
  {
    branch: "fix/repair",
    id: "repairing",
    label: "Repairing worktree",
    status: "repairing",
    statusLabel: "Repairing",
  },
];

const capturedWorkspaceBranch: WorkspaceBranch = {
  branch: "feat/current-branch",
  id: "created:feat/current-branch",
  label: "Current branch",
  meta: "clean",
  status: "available",
};

const workspaceWorktreesByProject: Record<
  string,
  typeof workspaceBranches
> = {
  "app-server-client": [workspaceBranches[0]],
  "codex-ui-kit": workspaceBranches,
  "desktop-shell": [workspaceBranches[0]],
  tooling: [workspaceBranches[0]],
};

const currentSidebarProjects = [
  {
    id: "session-browser",
    label: "session-browser",
    tasks: ["Inspect timeline structure"],
  },
  {
    id: "desktop-cleanup",
    label: "desktop-cleanup",
    tasks: ["Verify recent item cleanup", "Inspect failed task"],
  },
  {
    id: "codex-ui-kit",
    label: "codex-ui-kit",
    selected: true,
    tasks: ["Match current sidebar", "Review responsive shell"],
  },
  {
    id: "design-assets",
    label: "design-assets",
    status: "unread" as const,
    tasks: [
      "Audit monthly layout",
      "Compare visual baseline",
      "Tune compact spacing",
    ],
  },
  {
    id: "protocol-client",
    label: "protocol-client",
    tasks: ["Check compatibility matrix"],
  },
];

const currentSidebarWorktreeTasks = [
  "Run worktree activity check",
  "Worktree init failed",
  "Recovered worktree update",
  "Restored worktree task",
];

const currentWorktreeSetupFailureLog = `[info] Starting worktree creation
Preparing worktree (detached HEAD COMMIT)
fatal: could not create leading directories of '.git/worktrees/PROJECT': Not a directory
[stderr] git worktree add failed: Preparing worktree (detached HEAD COMMIT)
fatal: could not create leading directories of '.git/worktrees/PROJECT': Not a directory`;

function initialCurrentWorktreeSetupPhase(
  frame: string | null,
): WorktreeSetupPhase {
  if (frame === "current-worktree-setup-created") return "created";
  if (frame === "current-worktree-setup-creating") return "creating";
  return "failed";
}

function currentWorktreeSetupFrame(frame: string | null) {
  return frame?.startsWith("current-worktree-setup-") ?? false;
}

function currentSidebarTaskStatus(projectId: string, taskIndex: number) {
  const fixture = `${projectId}:${taskIndex}`;
  switch (fixture) {
    case "session-browser:0":
      return "active" as const;
    case "desktop-cleanup:0":
      return "waiting" as const;
    case "desktop-cleanup:1":
      return "error" as const;
    case "codex-ui-kit:0":
      return "unread" as const;
    case "design-assets:2":
      return "unread" as const;
    default:
      return "idle" as const;
  }
}

function currentSidebarTaskWorktreeStatus(
  projectId: string,
  taskIndex: number,
): AppSidebarWorktreeStatus | undefined {
  const fixture = `${projectId}:${taskIndex}`;
  return {
    "codex-ui-kit:1": "queued",
    "design-assets:0": "creating",
    "design-assets:1": "setting-up",
    "design-assets:2": "failed",
    "protocol-client:0": "restored",
  }[fixture] as AppSidebarWorktreeStatus | undefined;
}

function currentSidebarTaskStatusLabel(projectId: string, taskIndex: number) {
  const worktreeStatus = currentSidebarTaskWorktreeStatus(
    projectId,
    taskIndex,
  );
  if (worktreeStatus) {
    return {
      queued: "Worktree creation is queued",
      creating: "Worktree is being created",
      "setting-up": "Worktree is being set up",
      failed: "Worktree init failed",
      restored: undefined,
    }[worktreeStatus];
  }
  const status = currentSidebarTaskStatus(projectId, taskIndex);
  return {
    active: "Task is active",
    error: "Task failed",
    idle: undefined,
    unread: "Task has an unread update",
    waiting: "Needs input",
  }[status];
}

function currentSidebar26825WorktreeStatus(taskIndex: number) {
  return ["setting-up", "failed", "restored", "restored"][
    taskIndex
  ] as AppSidebarWorktreeStatus;
}

function currentSidebar26825WorktreeItemStatus(taskIndex: number) {
  return (["active", "idle", "unread", "idle"] as const)[taskIndex];
}

function currentSidebar26825WorktreeFixture(taskIndex: number) {
  return ["active", "failed", "recovered", "restored"][taskIndex];
}

const initialPersonalizationSettings: PersonalizationSettingsValue = {
  customInstructions: "Keep responses concise and include verification steps.",
  localMemories: true,
  personality: "friendly",
  toolAssistedMemoryGeneration: true,
};

export function App() {
  const initialSelection = useMemo(querySelection, []);
  const currentComposerControls26825Replay =
    initialSelection.view === "workspace" &&
    initialSelection.frame?.startsWith(
      "workspace-composer-current-26-825-",
    );
  const currentComposerMultiline26825Replay =
    initialSelection.frame ===
      "workspace-composer-current-26-825-multiline-four" ||
    initialSelection.frame ===
      "workspace-composer-current-26-825-multiline-long";
  const currentComposerQueue26825Replay =
    initialCurrentQueue26825Phase(initialSelection.frame) !== null;
  const currentContext26825Replay =
    initialSelection.view === "workspace" &&
    (initialSelection.frame?.startsWith(
      "workspace-context-current-26-825-",
    ) ||
      currentComposerControls26825Replay);
  const [scenarioId, setScenarioId] = useState<ReplayScenarioId>(
    initialSelection.scenarioId,
  );
  const scenario = replayScenarios[scenarioId];
  const initialCount = replayCountForSelection(
    scenario,
    initialSelection.frame,
  );
  const [replayCount, setReplayCount] = useState(initialCount);
  const [liveState, dispatchLive] = useReducer(
    reduceProtocolNotification,
    initialProtocolState,
  );
  const [mode, setMode] = useState<"live" | "replay">("replay");
  const [theme, setTheme] = useState<DemoThemePreference>(
    initialSelection.theme,
  );
  const [routeHistory, setRouteHistory] = useState(() =>
    createDemoRouteHistory(
      initialSelection.view,
      initialSelection.frame === "route-continuity-projects"
        ? ["workspace"]
        : [],
    ),
  );
  const view = currentDemoRoute(routeHistory);
  const setView = (nextView: DemoView) =>
    setRouteHistory((current) => pushDemoRoute(current, nextView));
  const navigateRouteHistory = (delta: -1 | 1) =>
    setRouteHistory((current) => moveDemoRoute(current, delta));
  const themeAvailable = isDemoThemeView(view);
  const appliedTheme = themeAvailable ? theme : "dark";
  const [workspaceProjectId, setWorkspaceProjectId] = useState<
    string | null
  >(
    initialSelection.view === "workspace" &&
      initialSelection.frame === "workspace-no-project"
      ? null
      : initialSelection.view === "workspace" &&
          initialSelection.frame === "workspace-environment" &&
          window.codexDemo
        ? window.codexDemo.workspaceProjectId
      : "codex-ui-kit",
  );
  const workspaceProjectIdRef = useRef(workspaceProjectId);
  const workspaceBranchCheckoutActiveRef = useRef(false);
  const workspaceRunLocationVersionRef = useRef(0);
  const [projectIndexQuery, setProjectIndexQuery] = useState(
    initialSelection.frame === "projects-index-empty" ? "missing" : "",
  );
  const [createdProjects, setCreatedProjects] = useState<
    Array<{
      id: string;
      label: string;
      path: string;
      projectToken?: string;
    }>
  >([]);
  const [workspaceProjectTokens, setWorkspaceProjectTokens] = useState<
    Record<string, string>
  >(() =>
    window.codexDemo
      ? {
          [window.codexDemo.workspaceProjectId]:
            window.codexDemo.startupWorkspaceProjectToken,
        }
      : {},
  );
  const [workspaceHostBranchesByProject, setWorkspaceHostBranchesByProject] =
    useState<Record<string, WorkspaceHostBranchState>>({});
  const workspaceProjectToken = workspaceProjectId
    ? workspaceProjectTokens[workspaceProjectId]
    : undefined;
  const workspaceUsesHostBranches = Boolean(
    window.codexDemo && !window.codexDemo.useWorkspaceBranchFixture,
  );
  const [projectIndexChat, setProjectIndexChat] = useState<
    | {
        chatId: string;
        chatLabel: string;
        projectId: string;
      }
    | undefined
  >();
  const [projectIndexChatTurns, setProjectIndexChatTurns] = useState<
    Array<{ id: number; prompt: string; response: string }>
  >([]);
  const projectIndexChatTurnCounterRef = useRef(0);
  const [projectCreationStatus, setProjectCreationStatus] = useState<
    "error" | "idle" | "selecting"
  >("idle");
  const [projectCreationSource, setProjectCreationSource] = useState<
    "projects" | "sidebar" | "workspace" | null
  >(null);
  const [projectIndexSortBy, setProjectIndexSortBy] = useState<
    "name" | "updated"
  >("updated");
  const [projectIndexSortDirection, setProjectIndexSortDirection] =
    useState<"ascending" | "descending">("descending");
  const [expandedProjectIndexIds, setExpandedProjectIndexIds] = useState(
    () =>
      new Set(
        initialSelection.frame === "projects-index-expanded"
          ? ["codex-ui-kit"]
          : [],
      ),
  );
  const [workspaceEnvironmentId, setWorkspaceEnvironmentId] =
    useState<"local" | "worktree">(
      initialSelection.view === "workspace" &&
        (initialSelection.frame?.endsWith("-new-worktree") ||
          initialSelection.frame?.endsWith("-environment-picker") ||
          initialSelection.frame === "workspace-environments-unavailable")
        ? "worktree"
        : "local",
    );
  const [workspacePage, setWorkspacePage] = useState<
    | "appearance-settings"
    | "code-review-settings"
    | "conversation"
    | "environments"
    | "general-settings"
    | "git-settings"
    | "hooks-settings"
    | "keyboard-shortcuts-settings"
    | "personalization-settings"
    | "plan-settings"
    | "usage-settings"
    | "voice-settings"
    | "worktree-settings"
  >(
    initialSelection.view === "workspace" &&
      initialSelection.frame === "workspace-environments-unavailable"
      ? "environments"
      : initialSelection.view === "workspace" &&
          ["workspace-git-settings", "workspace-git-settings-compact"].includes(
            initialSelection.frame ?? "",
          )
        ? "git-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-hooks-settings")
        ? "hooks-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-worktree-settings")
        ? "worktree-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-code-review-settings")
        ? "code-review-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-general-settings")
        ? "general-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-personalization-settings")
        ? "personalization-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-keyboard-shortcuts")
        ? "keyboard-shortcuts-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-plan-settings")
        ? "plan-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-usage-settings")
        ? "usage-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-voice-settings")
        ? "voice-settings"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("workspace-appearance-settings")
        ? "appearance-settings"
      : "conversation",
  );
  const [settingsQuery, setSettingsQuery] = useState("");
  const [selectedSettingsId, setSelectedSettingsId] = useState(
    initialSelection.frame?.startsWith("workspace-plan-settings") ||
      initialSelection.frame?.startsWith("workspace-usage-settings")
      ? "usage-billing"
      : initialSelection.frame?.startsWith("workspace-personalization-settings")
      ? "personalization"
      : initialSelection.frame?.startsWith("workspace-keyboard-shortcuts")
        ? "keyboard-shortcuts"
      : initialSelection.frame?.startsWith("workspace-voice-settings")
        ? "voice"
      : initialSelection.frame?.startsWith("workspace-general-settings")
      ? "general"
      : initialSelection.frame?.startsWith("workspace-appearance-settings")
        ? "appearance"
        : initialSelection.frame?.startsWith("workspace-hooks-settings")
          ? "hooks"
        : initialSelection.frame?.startsWith("workspace-worktree-settings")
          ? "worktrees"
        : initialSelection.frame?.startsWith("workspace-code-review-settings")
          ? "code-review"
        : "git",
  );
  const [settingsRouteFocusPending, setSettingsRouteFocusPending] =
    useState(false);
  const settingsBackButtonRef = useRef<HTMLButtonElement>(null);
  const [gitSettings, setGitSettings] = useState<GitSettingsValue>({
    alwaysForcePush: false,
    branchPrefix: "",
    commitInstructions: "",
    createDraftPullRequests: true,
    mergeMethod: "merge",
    pullRequestInstructions: "",
    reviewDelivery: "inline",
  });
  const [appearanceSettings, setAppearanceSettings] =
    useState<AppearanceSettingsValue>({
      codeFontSize: 12,
      dark: {
        accent: "Default",
        background: "#181818",
        codeFont: "System default",
        codeFontStyle: "Regular",
        codeTheme: "Codex",
        contrast: 60,
        foreground: "#FFFFFF",
        translucentSidebar: true,
        uiFont: "System default",
        uiFontStyle: "Regular",
      },
      diffMarkers: "color",
      dockIcon: "codex",
      fontSmoothing: true,
      light: {
        accent: "Default",
        background: "#FFFFFF",
        codeFont: "System default",
        codeFontStyle: "Regular",
        codeTheme: "Codex",
        contrast: 45,
        foreground: "#1A1C1F",
        translucentSidebar: true,
        uiFont: "System default",
        uiFontStyle: "Regular",
      },
      reduceMotion: "system",
      theme: "system",
      uiFontSize: 14,
      usePointerCursors: false,
    });
  const [appearanceThemeAction, setAppearanceThemeAction] = useState("");
  const [generalSettings, setGeneralSettings] = useState<GeneralSettingsValue>({
    ambientSuggestions: true,
    autoReview: true,
    bottomPanel: true,
    confettiCannon: false,
    defaultFileOpenDestination: "vscode",
    followUpBehavior: "queue",
    fullAccess: true,
    language: "auto",
    permissionNotifications: true,
    plainTextComposer: false,
    pluginsEnabled: true,
    popoutHotkey: null,
    popoutStandaloneChat: false,
    preventSleepWhileRunning: false,
    projectlessTaskFolder: "/Users/demo/Documents/Codex",
    questionNotifications: true,
    sendShortcut: "enter",
    showContextWindowUsage: false,
    showInMenuBar: true,
    speed: "standard",
    terminalLocation: "bottom",
    turnCompletionNotifications: "unfocused",
  });
  const [generalHotkeyCaptureActive, setGeneralHotkeyCaptureActive] = useState(
    initialSelection.frame === "workspace-general-settings-hotkey",
  );
  useEffect(() => {
    if (workspacePage !== "general-settings") {
      setGeneralHotkeyCaptureActive(false);
    }
  }, [workspacePage]);
  const [generalSettingsAction, setGeneralSettingsAction] = useState("");
  const [personalizationSettings, setPersonalizationSettings] =
    useState<PersonalizationSettingsValue>(initialPersonalizationSettings);
  const [savedCustomInstructions, setSavedCustomInstructions] = useState(
    initialPersonalizationSettings.customInstructions,
  );
  const [personalizationMenuOpen, setPersonalizationMenuOpen] = useState(
    initialSelection.frame === "workspace-personalization-settings-menu",
  );
  const [personalizationSettingsAction, setPersonalizationSettingsAction] =
    useState("");
  const [keyboardShortcuts, setKeyboardShortcuts] = useState<
    readonly KeyboardShortcutEntry[]
  >(currentKeyboardShortcuts);
  const [keyboardShortcutQuery, setKeyboardShortcutQuery] = useState(
    initialSelection.frame === "workspace-keyboard-shortcuts-search"
      ? "dictation"
      : "",
  );
  const [keyboardShortcutCaptureTarget, setKeyboardShortcutCaptureTarget] =
    useState<KeyboardShortcutCaptureTarget | null>(
      initialSelection.frame === "workspace-keyboard-shortcuts-edit"
        ? { entryId: "new-chat-start-a-new-chat", shortcutIndex: 0 }
        : null,
    );
  const [keyboardShortcutAction, setKeyboardShortcutAction] = useState("");
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsValue>({
    dictionaryEntries: [""],
    holdToDictateHotkey: null,
    keepDictationBarVisible: false,
    microphoneId: "system-default",
    screenContext: true,
    toggleDictationHotkey: null,
    voiceChatHotkey: null,
    voiceId: "sol",
  });
  const [voiceCapturingHotkey, setVoiceCapturingHotkey] =
    useState<VoiceSettingsHotkeyId | null>(
      initialSelection.frame === "workspace-voice-settings-hotkey"
        ? "holdToDictate"
        : null,
    );
  const [voiceMicrophoneMenuOpen, setVoiceMicrophoneMenuOpen] = useState(
    initialSelection.frame === "workspace-voice-settings-microphone-menu",
  );
  const [voicePickerOpen, setVoicePickerOpen] = useState(
    initialSelection.frame === "workspace-voice-settings-picker",
  );
  const [voiceSettingsAction, setVoiceSettingsAction] = useState("");
  const [usageSettingsAction, setUsageSettingsAction] = useState("");
  const [planAudience, setPlanAudience] = useState<"business" | "personal">(
    initialSelection.frame === "workspace-plan-settings-business"
      ? "business"
      : "personal",
  );
  const [planMultiplier, setPlanMultiplier] = useState<"20x" | "5x">(
    "20x",
  );
  const [businessBilling, setBusinessBilling] = useState<
    "annual" | "monthly"
  >("annual");
  const [planSelectionAction, setPlanSelectionAction] = useState("");
  const [worktreeSettings, setWorktreeSettings] =
    useState<WorktreeSettingsValue>({
      autoDelete: true,
      autoDeleteLimit: 15,
      fetchUpstream: false,
      root: "",
    });
  const [managedWorktreeEntries, setManagedWorktreeEntries] = useState<
    readonly ManagedWorktreeEntry[]
  >(() =>
    initialSelection.frame === "workspace-worktree-settings-empty"
      ? []
      : initialSelection.frame === "workspace-worktree-settings-conversations"
        ? [currentWorktreeSettingsConversationEntry]
        : [currentWorktreeSettingsEntry],
  );
  const [worktreeSettingsRefreshing, setWorktreeSettingsRefreshing] =
    useState(false);
  const [worktreeSettingsAction, setWorktreeSettingsAction] = useState("");
  const [hookSettingsEntries, setHookSettingsEntries] = useState<
    readonly HookSettingsEntry[]
  >(() =>
    initialSelection.frame === "workspace-hooks-settings-configured"
      ? configuredHookSettingsEntries
      : [],
  );
  const [hookSettingsStatus, setHookSettingsStatus] = useState<
    "error" | "loading" | "ready"
  >(() =>
    initialSelection.frame === "workspace-hooks-settings-loading"
      ? "loading"
      : initialSelection.frame === "workspace-hooks-settings-error"
        ? "error"
        : "ready",
  );
  const [hooksRefreshing, setHooksRefreshing] = useState(false);
  const [hooksSettingsAction, setHooksSettingsAction] = useState("");
  const [codeReviewSettings, setCodeReviewSettings] =
    useState<CodeReviewSettingsValue>({
      allowCreditsForCodeReviews: false,
      automaticReview: true,
      exhaustiveCodeReview: false,
      triggerPolicy: "pr_open",
    });
  const [savedCommitInstructions, setSavedCommitInstructions] = useState("");
  const [savedPullRequestInstructions, setSavedPullRequestInstructions] =
    useState("");
  const [workspaceWorktreeId, setWorkspaceWorktreeId] = useState(
    initialSelection.view === "workspace" &&
      initialSelection.frame === "workspace-repairing"
      ? "repairing"
      : initialSelection.view === "workspace" &&
          initialSelection.frame === "workspace-branch-created"
        ? capturedWorkspaceBranch.id
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.startsWith("current-home-")
        ? "main"
      : initialSelection.view === "workspace" && initialSelection.capture
        ? "feature"
        : "main",
  );
  const workspaceLinkedWorktreeSelectionRef = useRef<string | null>(null);
  const workspaceWorktreeIdRef = useRef(workspaceWorktreeId);
  const updateWorkspaceWorktreeId = (
    worktreeId: string,
    linkedSelection = false,
  ) => {
    workspaceLinkedWorktreeSelectionRef.current = linkedSelection
      ? worktreeId
      : null;
    workspaceWorktreeIdRef.current = worktreeId;
    setWorkspaceWorktreeId(worktreeId);
  };
  const [workspaceLocalEnvironmentOpen, setWorkspaceLocalEnvironmentOpen] =
    useState(
      initialSelection.view === "workspace" &&
        initialSelection.frame === "workspace-environment",
    );
  const [workspaceOverlay, setWorkspaceOverlay] = useState<
    | "environment"
    | "project"
    | "worktree"
    | "worktree-environment"
    | null
  >(
    initialSelection.view === "workspace" &&
      initialSelection.frame?.endsWith("-project-menu")
      ? "project"
      : initialSelection.view === "workspace" &&
          initialSelection.frame?.endsWith("-environment-menu")
        ? "environment"
        : initialSelection.view === "workspace" &&
            initialSelection.frame?.endsWith("-worktree-menu")
          ? "worktree"
          : initialSelection.view === "workspace" &&
              initialSelection.frame?.endsWith("-environment-picker")
            ? "worktree-environment"
            : null,
  );
  const [workspaceBranchQuery, setWorkspaceBranchQuery] = useState("");
  const [workspaceCreatedBranches, setWorkspaceCreatedBranches] = useState<
    Record<string, WorkspaceBranch[]>
  >(() =>
    initialSelection.frame === "workspace-branch-created"
      ? { "codex-ui-kit": [capturedWorkspaceBranch] }
      : ({} as Record<string, WorkspaceBranch[]>),
  );
  const [workspaceBranchDialogOpen, setWorkspaceBranchDialogOpen] =
    useState(
      initialSelection.view === "workspace" &&
        [
          "workspace-branch-create",
          "workspace-branch-create-error",
          "workspace-branch-create-filled",
        ].includes(initialSelection.frame ?? ""),
    );
  const [workspaceBranchName, setWorkspaceBranchName] = useState(() =>
    initialSelection.frame === "workspace-branch-create-error"
      ? "main"
      : initialSelection.frame === "workspace-branch-create-filled"
        ? "feat/current-branch"
        : "",
  );
  const [workspaceBranchStatus, setWorkspaceBranchStatus] = useState<
    "creating" | "error" | "idle"
  >(
    initialSelection.frame === "workspace-branch-create-error"
      ? "error"
      : "idle",
  );
  const [workspaceBranchError, setWorkspaceBranchError] = useState<
    string | undefined
  >(
    initialSelection.frame === "workspace-branch-create-error"
      ? "A branch named main already exists."
      : undefined,
  );
  const [workspaceBranchSwitchError, setWorkspaceBranchSwitchError] =
    useState<string>();
  const [workspaceBranchCheckoutPending, setWorkspaceBranchCheckoutPending] =
    useState(false);
  const updateWorkspaceProjectId = (projectId: string | null) => {
    workspaceProjectIdRef.current = projectId;
    setWorkspaceBranchSwitchError(undefined);
    setWorkspaceProjectId(projectId);
  };
  const [workspaceEnvironmentQuery, setWorkspaceEnvironmentQuery] =
    useState("");
  const [workspaceProjectQuery, setWorkspaceProjectQuery] = useState("");
  const [workspaceProjectTriggerId, setWorkspaceProjectTriggerId] =
    useState("demo-workspace-project-trigger");
  const [shellState, setShellState] = useState<AppRouteOutletStatus>(
    initialSelection.shellState,
  );
  const [shellNotificationVisible, setShellNotificationVisible] = useState(
    initialSelection.shellState === "ready" &&
      initialSelection.frame === "shell-restored",
  );
  const [shellQueuedNotificationIds, setShellQueuedNotificationIds] = useState<
    string[]
  >(() =>
    initialSelection.frame === "shell-notification-success-stack"
      ? ["success-a", "success-b", "success-c", "success-d"]
      : initialSelection.frame === "shell-notification-queue"
        ? ["success", "permission", "background", "update"]
        : [],
  );
  const [shellNotificationAction, setShellNotificationAction] = useState<
    string | null
  >(null);
  const [appServerCrashed, setAppServerCrashed] = useState(
    initialSelection.frame === "app-server-crashed",
  );
  const [composerValue, setComposerValue] = useState(() =>
    initialComposerValue(initialSelection.frame),
  );
  const [workspacePersistedTaskAvailable] = useState(() =>
    currentWorkspacePersistenceFrame(initialSelection.frame),
  );
  const [workspaceDirectoryMissing] = useState(
    initialSelection.frame === "workspace-directory-missing",
  );
  const [workspaceModelOnlyTurns, setWorkspaceModelOnlyTurns] = useState<
    Array<{ id: number; prompt: string; response: string }>
  >([]);
  const [composerOverlay, setComposerOverlay] =
    useState<ComposerOverlay>(() =>
      initialComposerOverlay(initialSelection.frame),
    );
  const [currentQueue26825Phase, setCurrentQueue26825Phase] =
    useState<CurrentQueue26825Phase>(() =>
      initialCurrentQueue26825Phase(initialSelection.frame),
    );
  const [composerMode, setComposerMode] = useState<ComposerMode>(() =>
    initialComposerMode(initialSelection.frame),
  );
  const [composerPermissionId, setComposerPermissionId] =
    useState("full");
  const [composerResourceActiveId, setComposerResourceActiveId] =
    useState("files");
  const [composerAttachments, setComposerAttachments] = useState<
    DemoComposerAttachmentItem[]
  >(() => attachmentItemsForFrame(initialSelection.frame));
  const [attachmentPreviewId, setAttachmentPreviewId] = useState<
    string | null
  >(
    initialSelection.frame === "attachment-current-preview"
      ? "current-product-image"
      : null,
  );
  const [submittedComposerAttachments, setSubmittedComposerAttachments] =
    useState<DemoComposerAttachmentItem[]>([]);
  const [submittedComposerPrompt, setSubmittedComposerPrompt] = useState<
    string | null
  >(null);
  const [queuedPrompts, setQueuedPrompts] = useState<QueuedPrompt[]>(() =>
    initialQueuedPrompts(initialSelection.frame),
  );
  const [queueingEnabled, setQueueingEnabled] = useState(true);
  const [queueInterrupted, setQueueInterrupted] = useState(
    initialSelection.frame === "composer-queue-paused" ||
      initialCurrentQueue26825Phase(initialSelection.frame) === "paused",
  );
  const [replayComposerSubmitting, setReplayComposerSubmitting] = useState(
    initialSelection.frame === "composer-disabled",
  );
  const [replayComposerFocusRequest, setReplayComposerFocusRequest] =
    useState(0);
  const [replayComposerStopped, setReplayComposerStopped] = useState(
    initialSelection.frame === "composer-queue-paused" ||
      initialCurrentQueue26825Phase(initialSelection.frame) === "paused",
  );
  const [threadSummaryOpen, setThreadSummaryOpen] = useState(
    initialSelection.frame === "context-summary-open" ||
      currentSubagentSummaryFrame(initialSelection.frame) ||
      currentWorkspacePersistenceFrame(initialSelection.frame),
  );
  const [mcpSourceSummaryOpen, setMcpSourceSummaryOpen] = useState(
    initialSelection.summaryState === "floating" ||
      initialSelection.summaryState === "pinned",
  );
  const [mcpSourceSummaryPinned, setMcpSourceSummaryPinned] = useState(
    initialSelection.summaryState === "pinned",
  );
  const [citationSummaryOpen, setCitationSummaryOpen] = useState(
    initialSelection.frame?.includes("citations-current-26-825-summary") ||
      initialSelection.frame ===
        "citations-current-26-825-sources-expanded-compact",
  );
  const [citationSourcesOpen, setCitationSourcesOpen] = useState(
    initialSelection.frame?.includes("citations-current-26-825-sources") ??
      false,
  );
  const [citationSearchExpanded, setCitationSearchExpanded] = useState(
    initialSelection.frame?.includes(
      "citations-current-26-825-sources-expanded",
    ) ?? false,
  );
  const [citationSourcesWidth, setCitationSourcesWidth] = useState(() =>
    isNarrowDemoWindow() ? 345.671875 : 418.515625,
  );
  const [replayQueuedContinuation, setReplayQueuedContinuation] =
    useState<string | null>(() =>
      initialQueuedContinuation(initialSelection.frame),
    );
  const [replayApprovalResolution, setReplayApprovalResolution] =
    useState<{
      decision: "approved" | "rejected";
      requestId: number | string;
    } | null>(null);
  const [replaySessionApprovalScope, setReplaySessionApprovalScope] = useState<
    "once" | "session" | null
  >(
    initialSelection.scenarioId === "approval-for-session" &&
      initialSelection.frame !== "approval-current-session-pending"
      ? "session"
      : null,
  );
  const [workspaceRunCwd, setWorkspaceRunCwd] = useState(
    "/workspace/codex-ui-kit",
  );
  const [workspaceRunPrompt, setWorkspaceRunPrompt] = useState<
    string | undefined
  >(undefined);
  const [workspaceRunProjectLabel, setWorkspaceRunProjectLabel] =
    useState(
      initialSelection.frame === "terminal-current-26-825-mismatch"
        ? "/"
        : initialSelection.frame === "terminal-current-mismatch"
        ? "assets"
        : "codex-ui-kit",
    );
  const [threadFollowing, setThreadFollowing] = useState(
    initialSelection.frame !== "thread-scroll-away" &&
      initialSelection.frame !== "thread-windowed" &&
      !current26825LongThreadFrame(initialSelection.frame),
  );
  const [activeFrame, setActiveFrame] = useState(initialSelection.frame);
  const [currentWorktreeSetupPhase, setCurrentWorktreeSetupPhase] =
    useState<WorktreeSetupPhase>(() =>
      initialCurrentWorktreeSetupPhase(initialSelection.frame),
    );
  const [currentWorktreeSetupStage, setCurrentWorktreeSetupStage] = useState<
    "checkout" | "prepare"
  >(
    initialSelection.frame === "current-worktree-setup-creating"
      ? "checkout"
      : "prepare",
  );
  const [currentWorktreeSetupExpanded, setCurrentWorktreeSetupExpanded] =
    useState(
      initialSelection.frame === "current-worktree-setup-failed",
    );
  const currentWorktreeSetupTimersRef = useRef<number[]>([]);
  const [scenarioSelectionVersion, setScenarioSelectionVersion] =
    useState(0);
  const [windowedSelectedMessageIndex, setWindowedSelectedMessageIndex] =
    useState(() => initialWindowedMessageIndex(initialSelection.frame));
  const [liveStartPending, setLiveStartPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      !initialSelection.frame?.startsWith("workspace-plan-settings") &&
      initialSelection.sidebarState !== "hidden" &&
      ((initialSelection.capture &&
        initialSelection.frame !== "pr-compact-detail" &&
        initialSelection.frame !== "workspace-compact-ready" &&
        initialSelection.frame !== "mcp-current-integration-recovered" &&
        initialSelection.frame !== "mcp-current-recovery-completed" &&
        initialSelection.frame !== "current-mixed-completed" &&
        initialSelection.frame !== "subagent-current-compact-720" &&
        initialSelection.sidebarState !== "compact-collapsed") ||
        !isNarrowDemoWindow()),
  );
  const [currentSidebarExpandedProjectIds, setCurrentSidebarExpandedProjectIds] =
    useState<Set<string>>(
      () =>
        new Set(
          currentSidebarProjects
            .filter(
              (_project, index) =>
                initialSelection.view !== "projects" &&
                (initialSelection.sidebarState !== "project-collapsed" ||
                  index !== 0),
            )
            .map((project) => project.id),
        ),
    );
  const [currentSidebarProjectMenuId, setCurrentSidebarProjectMenuId] =
    useState<string | null>(
      initialSelection.sidebarState === "project-menu"
        ? currentSidebarProjects[0].id
        : null,
    );
  const [currentSidebarHelpMenuOpen, setCurrentSidebarHelpMenuOpen] =
    useState(initialSelection.sidebarState === "help-menu");
  const [currentSidebarAccountMenuOpen, setCurrentSidebarAccountMenuOpen] =
    useState(initialSelection.sidebarState === "account-menu");
  const [reviewOpen, setReviewOpen] = useState(
    initialSelection.frame === "review-open" ||
      initialSelection.frame === "mixed-review-open" ||
      initialSelection.frame === "current-mixed-review-open" ||
      initialSelection.frame === "current-review-26-825-open",
  );
  const [browserPanelOpen, setBrowserPanelOpen] = useState(
    initialSelection.scenarioId === "current-browser-26-825",
  );
  const [browserPanelWidth, setBrowserPanelWidth] = useState(419.59375);
  const [subagentPanelOpen, setSubagentPanelOpen] = useState(
    currentSubagentPanelFrame(initialSelection.frame),
  );
  const [activeConversationSidePanel, setActiveConversationSidePanel] =
    useState<"review" | "subagents">(
      currentSubagentPanelFrame(initialSelection.frame)
        ? "subagents"
        : "review",
    );
  const [subagentClockMs, setSubagentClockMs] = useState(() => Date.now());
  const [selectedSubagentId, setSelectedSubagentId] = useState<string | null>(
    initialSubagentId(initialSelection.frame),
  );
  const [subagentPanelWidth, setSubagentPanelWidth] = useState(
    initialSelection.frame === "subagent-current-compact-820"
      ? 319
      : initialSelection.frame === "subagent-current-compact-720"
        ? 329.3125
        : 369.28125,
  );
  const [terminalOpen, setTerminalOpen] = useState(
    initialSelection.scenarioId === "background-terminal" ||
      (initialSelection.scenarioId === "terminal-lifecycle" &&
        initialSelection.frame !== "terminal-current-26-825-closed" &&
        initialSelection.frame !== "terminal-current-closed" &&
        initialSelection.frame !== "terminal-current-background-list" &&
        initialSelection.frame !== "terminal-current-background-open" &&
        initialSelection.frame !== "terminal-closed"),
  );
  const [terminalSessionIds, setTerminalSessionIds] = useState<string[]>(() =>
    initialTerminalSessionIds(
      initialSelection.scenarioId,
      initialSelection.frame,
    ),
  );
  const [closedTerminalSessionIds, setClosedTerminalSessionIds] =
    useState<string[]>(() =>
      initialClosedTerminalSessionIds(
        initialSelection.scenarioId,
        initialSelection.frame,
      ),
    );
  const [terminalTabPickerOpen, setTerminalTabPickerOpen] = useState(
    initialSelection.frame === "terminal-picker" ||
      initialSelection.frame === "terminal-current-26-825-picker",
  );
  const [terminalCommandId, setTerminalCommandId] = useState<string | null>(
    () =>
      initialTerminalSessionIds(
        initialSelection.scenarioId,
        initialSelection.frame,
      ).at(-1) ?? null,
  );
  const [terminalHeight, setTerminalHeight] = useState(() =>
    currentTerminal26825Frame(initialSelection.frame) ? 280 : 272,
  );
  const [terminalValuesByCommand, setTerminalValuesByCommand] = useState<
    Record<string, string>
  >({});
  const [terminalHistoryByCommand, setTerminalHistoryByCommand] = useState<
    Record<string, TerminalEntry[]>
  >(() =>
    initialTerminalHistory(
      initialSelection.scenarioId,
      initialSelection.frame,
    ),
  );
  const [terminalWorkspaceBySession, setTerminalWorkspaceBySession] =
    useState<Record<string, string>>(() =>
      initialTerminalWorkspaceLabels(
        initialSelection.scenarioId,
        initialSelection.frame,
      ),
    );
  const [dismissedTerminalMismatchIds, setDismissedTerminalMismatchIds] =
    useState<Set<string>>(() => new Set());
  const [terminalReloadPendingIds, setTerminalReloadPendingIds] =
    useState<Set<string>>(() => new Set());
  const [terminalReloadSessionId, setTerminalReloadSessionId] =
    useState<string | null>(() =>
      initialSelection.frame === "terminal-current-reload"
        ? "local-terminal-1"
        : null,
    );
  const [backgroundTerminalPanelWidth, setBackgroundTerminalPanelWidth] =
    useState(381.4375);
  const [backgroundTerminalPanelOpen, setBackgroundTerminalPanelOpen] =
    useState(
      initialSelection.scenarioId === "terminal-lifecycle" &&
        (initialSelection.frame === "terminal-current-background-list" ||
          initialSelection.frame === "terminal-current-background-open"),
    );
  const [backgroundTerminalRunning, setBackgroundTerminalRunning] =
    useState(true);
  const [reviewSelection, setReviewSelection] =
    useState<ReviewSelection | null>(null);
  const [reviewSelectionKey, setReviewSelectionKey] = useState(0);
  const [reviewPanelWidth, setReviewPanelWidth] = useState(
    initialSelection.scenarioId === "current-review-26-825-files"
      ? 592.828125
      : initialSelection.scenarioId === "current-review-files" ||
          initialSelection.scenarioId === "current-review-rename"
        ? 419.59375
        : 370,
  );
  const [fileRevertErrorOpen, setFileRevertErrorOpen] = useState(
    initialSelection.frame === "undo-failed",
  );
  const [rawToolOutput, setRawToolOutput] = useState<{
    name: string;
    value: unknown;
  } | null>(null);
  const [pullRequestState, dispatchPullRequest] = useReducer(
    reducePullRequestLifecycle,
    initialSelection.frame,
    initialPullRequestLifecycleState,
  );
  const [pullRequestExpanded, setPullRequestExpanded] = useState(
    initialSelection.frame === "pr-detail-current-26-825-summary-expanded",
  );
  const [pullRequestOpen, setPullRequestOpen] = useState(
    initialSelection.view === "pull-request" &&
      (pullRequestState.selectedId !== null ||
        initialSelection.frame?.startsWith("pr-index-current-26-825-") ||
        initialSelection.frame?.startsWith("pr-detail-current-26-825-")),
  );
  const [pullRequestWidth, setPullRequestWidth] = useState(
    initialSelection.frame?.startsWith("pr-index-current-26-825-") ||
      initialSelection.frame?.startsWith("pr-detail-current-26-825-")
      ? 419.59375
      : 370,
  );
  const [pullRequestTab, setPullRequestTab] = useState<
    "code" | "summary"
  >(
    initialSelection.frame?.startsWith("pr-review-") ||
      initialSelection.frame === "pr-detail-current-26-825-code"
      ? "code"
      : "summary",
  );
  const [pullRequestReviewOpen, setPullRequestReviewOpen] = useState(
    initialSelection.frame?.startsWith("pr-review-") ?? false,
  );
  const [pullRequestReviewMenuOpen, setPullRequestReviewMenuOpen] =
    useState(false);
  const [undoneFileIds, setUndoneFileIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [revertedCurrentReviewIds, setRevertedCurrentReviewIds] = useState<
    Set<string>
  >(() => new Set());
  const [currentReviewConflictArmed, setCurrentReviewConflictArmed] = useState(
    initialSelection.frame === "undo-failed",
  );
  const [liveError, setLiveError] = useState<string | null>(null);
  const liveStartPendingRef = useRef(false);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const composerResourceTriggerRef = useRef<HTMLButtonElement>(null);
  const mcpSourceSummaryTriggerRef = useRef<HTMLButtonElement>(null);
  const workspaceEnvironmentTriggerRef =
    useRef<HTMLButtonElement>(null);
  const workspaceWorktreeTriggerRef = useRef<HTMLButtonElement>(null);
  const [workspaceEnvironmentLauncher, setWorkspaceEnvironmentLauncher] =
    useState<"environment" | "worktree">("environment");
  const queuedPromptCounterRef = useRef(1);
  const attachmentSelectionCounterRef = useRef(1);
  const workspaceModelOnlyTurnCounterRef = useRef(1);
  const terminalSessionCounterRef = useRef(
    initialTerminalSessionIds(
      initialSelection.scenarioId,
      initialSelection.frame,
    ).filter((sessionId) => sessionId.startsWith("local-terminal-")).length +
      1,
  );
  const replaySubmitTimerRef = useRef<number | null>(null);
  const pullRequestTransitionTimerRef = useRef<number | null>(null);
  const terminalReloadTimerRef = useRef<number | null>(null);
  const threadViewportRef = useRef<HTMLDivElement>(null);
  const liveApprovalSubmissionGateRef = useRef(
    new LiveApprovalSubmissionGate(),
  );
  useLayoutEffect(() => {
    if (
      initialSelection.frame !==
      "workspace-composer-current-26-825-multiline-long"
    ) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      const input = composerInputRef.current;
      if (input) input.scrollTop = input.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [initialSelection.frame]);
  const scenarioEvents = useMemo(
    () =>
      scenario.id === "workspace-workflow"
        ? contextualizeWorkspaceReplay(
            scenario.events,
            workspaceRunCwd,
            workspaceRunPrompt,
          )
        : scenario.events,
    [scenario, workspaceRunCwd, workspaceRunPrompt],
  );
  const replay = useMemo(
    () => replayState(scenarioEvents, replayCount),
    [replayCount, scenarioEvents],
  );
  const isConversationLifecycle =
    mode === "replay" && scenarioId === "conversation-lifecycle";
  const lifecycleReplay = useMemo(
    () => {
      if (!isConversationLifecycle) return replay;
      const continuedReplay = replayQueuedContinuation
        ? continueQueuedConversationReplay(
            replay,
            replayQueuedContinuation,
          )
        : replay;
      return replayComposerStopped
        ? interruptConversationReplay(continuedReplay)
        : continuedReplay;
    },
    [
      isConversationLifecycle,
      replay,
      replayComposerStopped,
      replayQueuedContinuation,
    ],
  );
  const state = useMemo(
    () => {
      if (mode === "live") return liveState;
      const resolvedReplay = replayApprovalResolution
        ? reduceProtocolNotification(lifecycleReplay, {
            ...replayApprovalResolution,
            kind: "approval-resolution",
          })
        : lifecycleReplay;
      if (
        scenarioId === "approval-denied" &&
        replayApprovalResolution?.decision === "approved"
      ) {
        return settleApprovedCommandReplay(
          resolvedReplay,
          replayApprovalResolution.requestId,
          {
            durationMs: 23_000,
            messageId: "assistant-approval-approved",
            messageText:
              "Approval was granted, and the command completed successfully.",
            replacedMessageId: "assistant-approval-denied",
          },
        );
      }
      if (
        scenarioId === "approval-for-session" &&
        replayApprovalResolution?.decision === "rejected"
      ) {
        return settleRejectedFileReplay(
          resolvedReplay,
          replayApprovalResolution.requestId,
        );
      }
      return resolvedReplay;
    },
    [
      lifecycleReplay,
      liveState,
      mode,
      replayApprovalResolution,
    ],
  );
  const isCurrentApprovalReplay =
    mode === "replay" &&
    (scenarioId === "approval-allow-once" ||
      scenarioId === "approval-current-26-820-file" ||
      scenarioId === "approval-current-26-825-file" ||
      scenarioId === "approval-denied" ||
      scenarioId === "approval-similar-commands" ||
      scenarioId === "approval-for-session");
  const isCurrentApproval26820FileReplay =
    mode === "replay" &&
    scenarioId === "approval-current-26-820-file";
  const isCurrentApproval26825FileReplay =
    mode === "replay" &&
    scenarioId === "approval-current-26-825-file";
  const isCurrentApprovalSimilarReplay =
    mode === "replay" && scenarioId === "approval-similar-commands";
  const isCurrentApprovalSessionReplay =
    mode === "replay" && scenarioId === "approval-for-session";
  const isCurrentAutomaticReviewReplay =
    mode === "replay" && scenarioId === "approval-review-timeout";
  const isCurrentAttachmentReplay =
    mode === "replay" && scenarioId === "attachment-lifecycle";
  const isCurrentLongCommandReplay =
    mode === "replay" && scenarioId === "long-command-output";
  const isCurrentCommandFailureReplay =
    mode === "replay" && scenarioId === "command-failure-recovery";
  const isCurrentCommandInterruptionReplay =
    mode === "replay" && scenarioId === "interruption";
  const isCurrentCommand26820SuccessReplay =
    mode === "replay" && scenarioId === "command-current-26-820-success";
  const isCurrentCommand26825FailureReplay =
    mode === "replay" && scenarioId === "command-current-26-825-failure";
  const isCurrentCommand26825InterruptionReplay =
    mode === "replay" &&
    scenarioId === "command-current-26-825-interruption";
  const isCurrentCommand26825SuccessReplay =
    mode === "replay" && scenarioId === "command-current-26-825-success";
  const isCurrentCommandReplay =
    isCurrentCommand26820SuccessReplay ||
    isCurrentCommand26825FailureReplay ||
    isCurrentCommand26825InterruptionReplay ||
    isCurrentCommand26825SuccessReplay;
  const isCurrentContextCompactionReplay =
    mode === "replay" && scenarioId === "compaction";
  const isCurrentContextSummaryReplay =
    mode === "replay" && scenarioId === "context-summary";
  const isCurrentNetworkTransportRecoveryReplay =
    mode === "replay" &&
    scenarioId === "streaming-recovery-current-26-825";
  const isLegacyTransportRecoveryReplay =
    mode === "replay" && scenarioId === "streaming-recovery";
  const isCurrentTransportRecoveryReplay =
    isLegacyTransportRecoveryReplay ||
    isCurrentNetworkTransportRecoveryReplay;
  const isCurrentBasicMessageReplay =
    mode === "replay" && scenarioId === "current-basic-message";
  const isCurrentBasic26825Replay =
    mode === "replay" && scenarioId === "current-basic-message-26-825";
  const usesCurrent26825ThreadHeader =
    isCurrentBasic26825Replay || isCurrentApproval26825FileReplay;
  const isAnyCurrentBasicMessageReplay =
    isCurrentBasicMessageReplay || isCurrentBasic26825Replay;
  const isCurrentBrowser26825Replay =
    mode === "replay" && scenarioId === "current-browser-26-825";
  const isCurrentBrowserFailure26825Replay =
    mode === "replay" && scenarioId === "current-browser-26-825-failure";
  const isCurrentCitations26825Replay =
    mode === "replay" && scenarioId === "current-citations-26-825";
  const isCurrentPullRequestReviewReplay =
    mode === "replay" &&
    activeFrame?.startsWith("pr-detail-current-26-825-");
  const isCurrentPullRequestRouteReplay =
    mode === "replay" &&
    (activeFrame?.startsWith("pr-index-current-26-825-") ||
      isCurrentPullRequestReviewReplay);
  const isCurrentMarkdown26818Replay =
    mode === "replay" && scenarioId === "markdown-current-26-818";
  const isCurrentMarkdown26820MediaReplay =
    mode === "replay" && scenarioId === "markdown-current-26-820-media";
  const isCurrentMarkdown26825Replay =
    mode === "replay" && scenarioId === "markdown-current-26-825";
  const isCurrentMarkdown26825MediaReplay =
    mode === "replay" && scenarioId === "markdown-current-26-825-media";
  const isCurrentRichMarkdownStreamingReplay =
    mode === "replay" && scenarioId === "markdown-streaming-large";
  const usesCurrentMarkdown26825Presentation =
    isCurrentMarkdown26825Replay ||
    isCurrentMarkdown26825MediaReplay ||
    isCurrentRichMarkdownStreamingReplay;
  const isCurrentMixedToolReplay =
    mode === "replay" && scenarioId === "current-mixed-tool-thread";
  const isCurrentPlan26825Replay =
    mode === "replay" && scenarioId === "current-plan-26-825";
  const isCurrentReasoning26825Replay =
    mode === "replay" && scenarioId === "current-reasoning-26-825";
  const isCurrentSearch26825Replay =
    mode === "replay" && scenarioId === "current-search-26-825";
  const usesCurrent322SidebarWidth =
    isCurrentBrowser26825Replay ||
    isCurrentBrowserFailure26825Replay ||
    isCurrentSearch26825Replay ||
    isCurrentMarkdown26825Replay ||
    isCurrentMarkdown26825MediaReplay;
  const isCurrentReviewFilesReplay =
    mode === "replay" && scenarioId === "current-review-files";
  const isCurrentReviewRenameReplay =
    mode === "replay" && scenarioId === "current-review-rename";
  const isCurrentReview26825FilesReplay =
    mode === "replay" && scenarioId === "current-review-26-825-files";
  const isCurrentReview26820Replay =
    isCurrentReviewFilesReplay || isCurrentReviewRenameReplay;
  const isCurrentReviewProductReplay =
    isCurrentReview26820Replay || isCurrentReview26825FilesReplay;
  const isCurrentMcp26818SuccessReplay =
    mode === "replay" && scenarioId === "mcp-current-26-818-success";
  const isCurrentMcp26818RecoveryReplay =
    mode === "replay" && scenarioId === "mcp-current-26-818-recovery";
  const isCurrentMcp26818Replay =
    isCurrentMcp26818SuccessReplay || isCurrentMcp26818RecoveryReplay;
  const isCurrentMcp26820SuccessReplay =
    mode === "replay" && scenarioId === "mcp-current-26-820-success";
  const isCurrentMcp26820RecoveryReplay =
    mode === "replay" && scenarioId === "mcp-current-26-820-recovery";
  const isCurrentMcp26820Replay =
    isCurrentMcp26820SuccessReplay || isCurrentMcp26820RecoveryReplay;
  const isCurrentMcp26825Replay =
    mode === "replay" && scenarioId === "mcp-current-26-825-lifecycle";
  const usesCurrentMcpFlatRows =
    isCurrentMcp26820Replay || isCurrentMcp26825Replay;
  const isCurrentMcpSuccessReplay =
    mode === "replay" &&
    (scenarioId === "mcp-current-success" ||
      scenarioId === "mcp-current-26-818-success" ||
      scenarioId === "mcp-current-26-820-success" ||
      scenarioId === "mcp-current-26-825-lifecycle");
  const isCurrentMcpRecoveryReplay =
    mode === "replay" &&
    (scenarioId === "mcp-current-recovery" ||
      scenarioId === "mcp-current-26-818-recovery" ||
      scenarioId === "mcp-current-26-820-recovery" ||
      scenarioId === "mcp-current-26-825-lifecycle");

  const clearCurrentWorktreeSetupTimers = useCallback(() => {
    currentWorktreeSetupTimersRef.current.forEach((timer) =>
      window.clearTimeout(timer),
    );
    currentWorktreeSetupTimersRef.current = [];
  }, []);

  const retryCurrentWorktreeSetup = useCallback(() => {
    clearCurrentWorktreeSetupTimers();
    setCurrentWorktreeSetupExpanded(false);
    setCurrentWorktreeSetupStage("prepare");
    setCurrentWorktreeSetupPhase("creating");
    currentWorktreeSetupTimersRef.current = [
      window.setTimeout(() => {
        setCurrentWorktreeSetupStage("checkout");
      }, 50),
      window.setTimeout(() => {
        setCurrentWorktreeSetupPhase("created");
        currentWorktreeSetupTimersRef.current = [];
      }, 180),
    ];
  }, [clearCurrentWorktreeSetupTimers]);

  useEffect(
    () => () => clearCurrentWorktreeSetupTimers(),
    [clearCurrentWorktreeSetupTimers],
  );

  useEffect(() => {
    setReviewPanelWidth(
      isCurrentReview26825FilesReplay
        ? 592.828125
        : isCurrentReview26820Replay
          ? 419.59375
          : 370,
    );
  }, [isCurrentReview26820Replay, isCurrentReview26825FilesReplay]);
  const isCurrentMcpReplay =
    mode === "replay" &&
    (scenarioId === "current-mixed-tool-thread" ||
      scenarioId === "mcp-current-integration-recovery" ||
      isCurrentMcpSuccessReplay ||
      isCurrentMcpRecoveryReplay);
  const isCurrentSubagentReplay =
    mode === "replay" && isSubagentScenarioId(scenarioId);
  const hasSubagentSurface =
    isCurrentSubagentReplay ||
    isCurrentMixedToolReplay ||
    (mode === "live" && state.subagents.length > 0);
  const subagentPanelSelected =
    hasSubagentSurface && activeConversationSidePanel === "subagents";
  const replayComposerRunning =
    isConversationLifecycle && state.status === "running";

  useEffect(() => {
    if (replayComposerFocusRequest === 0) return;
    composerInputRef.current?.focus();
  }, [replayComposerFocusRequest]);

  useEffect(() => {
    if (!hasSubagentSurface) return;
    const syncSubagentPanelWidth = () => {
      setSubagentPanelWidth(
        window.innerWidth <= 720
          ? 329.3125
          : window.innerWidth <= 820
            ? 319
            : 369.28125,
      );
    };
    syncSubagentPanelWidth();
    window.addEventListener("resize", syncSubagentPanelWidth);
    return () => {
      window.removeEventListener("resize", syncSubagentPanelWidth);
    };
  }, [hasSubagentSurface]);

  useEffect(() => {
    if (
      mode !== "live" ||
      state.subagents.length === 0 ||
      !subagentPanelSelected ||
      !subagentPanelOpen ||
      selectedSubagentId !== null
    ) {
      return;
    }
    setSubagentClockMs(Date.now());
    const timer = window.setInterval(() => setSubagentClockMs(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [
    mode,
    selectedSubagentId,
    state.subagents.length,
    subagentPanelOpen,
    subagentPanelSelected,
  ]);

  useEffect(() => {
    if (!window.codexDemo) return;
    const removeNotification = window.codexDemo.onNotification((notification) => {
      dispatchLive(notification);
    });
    const removeServerRequest = window.codexDemo.onServerRequest((request) => {
      dispatchLive(request);
    });
    return () => {
      removeNotification();
      removeServerRequest();
    };
  }, []);

  useEffect(() => {
    if (
      !workspaceUsesHostBranches ||
      !window.codexDemo ||
      !workspaceProjectId ||
      !workspaceProjectToken
    ) {
      return;
    }
    const projectId = workspaceProjectId;
    const initialWorktreeId = workspaceWorktreeIdRef.current;
    let cancelled = false;
    setWorkspaceHostBranchesByProject((current) => ({
      ...current,
      [projectId]: { status: "loading" },
    }));
    void window.codexDemo
      .listBranches({ projectToken: workspaceProjectToken })
      .then((response) => {
        if (cancelled) return;
        if (!response.ok) {
          setWorkspaceHostBranchesByProject((current) => ({
            ...current,
            [projectId]: {
              message: response.message,
              status: "error",
            },
          }));
          return;
        }
        setWorkspaceHostBranchesByProject((current) => ({
          ...current,
          [projectId]: {
            branches: response.branches,
            branchesCheckedOutElsewhere:
              response.branchesCheckedOutElsewhere,
            branchesUnavailableForCheckout:
              response.branchesUnavailableForCheckout,
            currentBranch: response.currentBranch,
            status: "ready",
            unbornBranch: response.unbornBranch,
          },
        }));
        if (workspaceProjectIdRef.current === projectId) {
          setWorkspaceWorktreeId((currentWorktreeId) => {
            if (
              workspaceLinkedWorktreeSelectionRef.current !== null ||
              currentWorktreeId !== initialWorktreeId
            ) {
              return currentWorktreeId;
            }
            const nextWorktreeId = response.currentBranch
              ? workspaceGitBranchId(response.currentBranch)
              : unattachedWorkspaceBranchId;
            workspaceWorktreeIdRef.current = nextWorktreeId;
            return nextWorktreeId;
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        setWorkspaceHostBranchesByProject((current) => ({
          ...current,
          [projectId]: {
            message: "Git could not list the repository branches.",
            status: "error",
          },
        }));
      });
    return () => {
      cancelled = true;
    };
  }, [
    workspaceProjectId,
    workspaceProjectToken,
    workspaceUsesHostBranches,
  ]);

  useEffect(() => {
    applyDemoThemePreference(document.documentElement, appliedTheme);
  }, [appliedTheme]);

  useEffect(() => {
    liveApprovalSubmissionGateRef.current.retainPending(
      liveState.approvals
        .filter(({ decision }) => decision === "pending")
        .map(({ requestId }) => requestId),
    );
  }, [liveState.approvals]);

  useEffect(
    () => () => {
      if (replaySubmitTimerRef.current !== null) {
        window.clearTimeout(replaySubmitTimerRef.current);
      }
      if (pullRequestTransitionTimerRef.current !== null) {
        window.clearTimeout(pullRequestTransitionTimerRef.current);
      }
      if (terminalReloadTimerRef.current !== null) {
        window.clearTimeout(terminalReloadTimerRef.current);
      }
    },
    [],
  );

  const cancelReplaySubmitTimer = () => {
    if (replaySubmitTimerRef.current === null) return;
    window.clearTimeout(replaySubmitTimerRef.current);
    replaySubmitTimerRef.current = null;
  };

  const cancelTerminalReloadTimer = () => {
    if (terminalReloadTimerRef.current === null) return;
    window.clearTimeout(terminalReloadTimerRef.current);
    terminalReloadTimerRef.current = null;
  };

  const completeReplayComposerSubmission = () => {
    setReplayComposerSubmitting(false);
    setReplayComposerFocusRequest((request) => request + 1);
  };

  const schedulePullRequestTransition = useCallback(
    (
      pending: PullRequestLifecycleAction,
      settled: PullRequestLifecycleAction,
    ) => {
      if (pullRequestTransitionTimerRef.current !== null) {
        window.clearTimeout(pullRequestTransitionTimerRef.current);
      }
      dispatchPullRequest(pending);
      pullRequestTransitionTimerRef.current = window.setTimeout(() => {
        dispatchPullRequest(settled);
        pullRequestTransitionTimerRef.current = null;
      }, 420);
    },
    [],
  );

  const selectReplayPosition = (nextCount: number) => {
    cancelReplaySubmitTimer();
    const replaySessionFrame =
      scenarioId === "approval-for-session"
        ? (Object.entries(scenario.frames).find(
            ([, frameCount]) => frameCount === nextCount,
          )?.[0] ?? null)
        : null;
    const replaySessionFirstCompletedCount =
      scenario.frames["approval-current-session-first-completed"];
    setActiveFrame(replaySessionFrame);
    setComposerOverlay(null);
    if (isCurrentAttachmentReplay) {
      setComposerAttachments([]);
      setSubmittedComposerAttachments([]);
      setSubmittedComposerPrompt(null);
    }
    setReplayComposerSubmitting(false);
    setReplayComposerStopped(false);
    setReplayQueuedContinuation(null);
    setReplayApprovalResolution(null);
    setReplaySessionApprovalScope(
      scenarioId === "approval-for-session" &&
        replaySessionFirstCompletedCount !== undefined &&
        nextCount >= replaySessionFirstCompletedCount
        ? "session"
        : null,
    );
    setThreadSummaryOpen(false);
    setQueueInterrupted(false);
    if (!isTurnActive(replayState(scenarioEvents, nextCount).status)) {
      setQueuedPrompts([]);
    }
    setReplayCount(nextCount);
  };

  const dismissSidebarAfterNavigation = () => {
    if (!isNarrowDemoWindow()) return;
    const shell = document.querySelector(".codex-ui-app-shell");
    if (!shell?.hasAttribute("data-sidebar-pinned")) {
      setSidebarOpen(false);
    }
  };

  const openWorkspace = (
    projectId: string | null = workspaceProjectId,
  ) => {
    cancelReplaySubmitTimer();
    setMode("replay");
    setView("workspace");
    setProjectIndexChat(undefined);
    setWorkspacePage("conversation");
    updateWorkspaceProjectId(projectId);
    setWorkspaceEnvironmentId("local");
    updateWorkspaceWorktreeId("main");
    setWorkspaceLocalEnvironmentOpen(false);
    setWorkspaceOverlay(null);
    setWorkspaceBranchQuery("");
    setWorkspaceEnvironmentQuery("");
    setWorkspaceProjectQuery("");
    setWorkspaceProjectTriggerId("demo-workspace-project-trigger");
    setComposerValue("");
    setComposerOverlay(null);
    setReplayApprovalResolution(null);
    setReplaySessionApprovalScope(null);
    setActiveFrame("workspace-ready");
    setReviewOpen(false);
    setSubagentPanelOpen(false);
    setActiveConversationSidePanel("review");
    setSelectedSubagentId(null);
    setTerminalOpen(false);
    setTerminalSessionIds([]);
    setClosedTerminalSessionIds([]);
    setTerminalWorkspaceBySession({});
    setDismissedTerminalMismatchIds(new Set());
    setTerminalTabPickerOpen(false);
    setTerminalCommandId(null);
    setTerminalValuesByCommand({});
    setTerminalHistoryByCommand({});
    setPullRequestOpen(false);
    dismissSidebarAfterNavigation();
  };

  const openProjectsIndex = () => {
    cancelReplaySubmitTimer();
    setMode("replay");
    setView("projects");
    setProjectIndexChat(undefined);
    setProjectIndexQuery("");
    setProjectIndexSortBy("updated");
    setProjectIndexSortDirection("descending");
    setExpandedProjectIndexIds(new Set());
    setActiveFrame("projects-index-ready");
    setReviewOpen(false);
    setSubagentPanelOpen(false);
    setTerminalOpen(false);
    setPullRequestOpen(false);
    dismissSidebarAfterNavigation();
  };

  const createProject = async (
    source: "projects" | "sidebar" | "workspace",
  ) => {
    if (projectCreationStatus === "selecting") return;
    setProjectCreationSource(source);
    setProjectCreationStatus("selecting");
    try {
      const selection = window.codexDemo
        ? await window.codexDemo.selectProjectDirectory()
        : {
            label: "new-project",
            path: "/workspace/new-project",
          };
      if (!selection) {
        setProjectCreationStatus("idle");
        setProjectCreationSource(null);
        return;
      }
      const knownProject = workspaceProjects.find(
        (project) => project.path === selection.path,
      );
      const id = knownProject?.id ?? `created:${selection.path}`;
      const selectedProjectToken = selection.projectToken;
      if (selectedProjectToken) {
        setWorkspaceProjectTokens((current) => ({
          ...current,
          [id]: selectedProjectToken,
        }));
      }
      setCreatedProjects((current) => {
        const withoutSelectedPath = current.filter(
          (project) => project.path !== selection.path,
        );
        return knownProject
          ? withoutSelectedPath
          : [{ id, ...selection }, ...withoutSelectedPath];
      });
      cancelReplaySubmitTimer();
      setMode("replay");
      setView("workspace");
      setProjectIndexChat(undefined);
      setWorkspacePage("conversation");
      updateWorkspaceProjectId(id);
      setWorkspaceEnvironmentId("local");
      updateWorkspaceWorktreeId("main");
      setWorkspaceLocalEnvironmentOpen(false);
      setWorkspaceOverlay(null);
      setWorkspaceBranchQuery("");
      setWorkspaceEnvironmentQuery("");
      setWorkspaceProjectQuery("");
      setWorkspaceProjectTriggerId("demo-workspace-project-trigger");
      setComposerValue("");
      setComposerOverlay(null);
      setReplayApprovalResolution(null);
      setReplaySessionApprovalScope(null);
      setActiveFrame(
        knownProject ? "workspace-ready" : "workspace-project-created",
      );
      setReviewOpen(false);
      setSubagentPanelOpen(false);
      setActiveConversationSidePanel("review");
      setSelectedSubagentId(null);
      setTerminalOpen(false);
      setTerminalSessionIds([]);
      setClosedTerminalSessionIds([]);
      setTerminalWorkspaceBySession({});
      setDismissedTerminalMismatchIds(new Set());
      setTerminalTabPickerOpen(false);
      setTerminalCommandId(null);
      setTerminalValuesByCommand({});
      setTerminalHistoryByCommand({});
      setPullRequestOpen(false);
      setProjectCreationStatus("idle");
      setProjectCreationSource(null);
      dismissSidebarAfterNavigation();
      window.setTimeout(() =>
        document.getElementById("demo-workspace-project-trigger")?.focus(),
      );
    } catch {
      setProjectCreationStatus("error");
    }
  };

  const openProjectIndexChat = (projectId: string, chatId: string) => {
    const project = currentProjectIndexItems.find(
      (candidate) => candidate.id === projectId,
    );
    const chat = project?.recentChats.find(
      (candidate) => candidate.id === chatId,
    );
    if (!project || !chat) return;
    openWorkspace(projectId);
    setProjectIndexChatTurns([]);
    setProjectIndexChat({
      chatId,
      chatLabel: chat.label,
      projectId,
    });
    setActiveFrame("projects-index-chat");
  };

  const selectScenario = (
    nextId: ReplayScenarioId,
    frame: string | null = null,
    workspaceContext?: {
      cwd: string;
      prompt: string;
      projectLabel: string;
    },
  ) => {
    cancelReplaySubmitTimer();
    cancelTerminalReloadTimer();
    const nextTerminalSessionIds = initialTerminalSessionIds(
      nextId,
      frame,
    );
    const nextClosedTerminalSessionIds =
      initialClosedTerminalSessionIds(nextId, frame);
    setWorkspaceRunCwd(
      workspaceContext?.cwd ?? "/workspace/codex-ui-kit",
    );
    setWorkspaceRunPrompt(
      nextId === "workspace-workflow"
        ? workspaceContext?.prompt
        : undefined,
    );
    setWorkspaceRunProjectLabel(
      workspaceContext?.projectLabel ??
        (frame === "terminal-current-26-825-mismatch"
          ? "/"
          : frame === "terminal-current-mismatch"
          ? "assets"
          : "codex-ui-kit"),
    );
    setView("conversation");
    setMode("replay");
    setScenarioId(nextId);
    setReplayCount(
      replayCountForSelection(replayScenarios[nextId], frame),
    );
    setComposerValue(initialComposerValue(frame));
    setComposerOverlay(initialComposerOverlay(frame));
    setComposerMode(initialComposerMode(frame));
    setComposerResourceActiveId("files");
    setComposerAttachments(attachmentItemsForFrame(frame));
    setAttachmentPreviewId(
      frame === "attachment-current-preview" ? "current-product-image" : null,
    );
    setSubmittedComposerAttachments([]);
    setSubmittedComposerPrompt(null);
    setQueuedPrompts([]);
    setQueueingEnabled(true);
    setQueueInterrupted(false);
    setReplayComposerSubmitting(false);
    setReplayComposerStopped(false);
    setReplayQueuedContinuation(initialQueuedContinuation(frame));
    setReplayApprovalResolution(null);
    setReplaySessionApprovalScope(
      nextId === "approval-for-session" &&
        frame !== "approval-current-session-pending"
        ? "session"
        : null,
    );
    setThreadSummaryOpen(
      (nextId === "context-summary" && frame === "context-summary-open") ||
        (isSubagentScenarioId(nextId) && currentSubagentSummaryFrame(frame)),
    );
    setMcpSourceSummaryOpen(false);
    setMcpSourceSummaryPinned(false);
    setActiveFrame(frame);
    setScenarioSelectionVersion((version) => version + 1);
    setWindowedSelectedMessageIndex(initialWindowedMessageIndex(frame));
    setReviewOpen(false);
    setReviewSelection(null);
    setFileRevertErrorOpen(false);
    setActiveConversationSidePanel(
      isSubagentScenarioId(nextId) && currentSubagentPanelFrame(frame)
        ? "subagents"
        : "review",
    );
    setSubagentPanelOpen(
      isSubagentScenarioId(nextId) && currentSubagentPanelFrame(frame),
    );
    setSelectedSubagentId(
      isSubagentScenarioId(nextId) ? initialSubagentId(frame) : null,
    );
    setSubagentPanelWidth(
      frame === "subagent-current-compact-820"
        ? 319
        : frame === "subagent-current-compact-720"
          ? 329.3125
          : 369.28125,
    );
    setTerminalOpen(
      nextId === "background-terminal" ||
        (nextId === "terminal-lifecycle" &&
          frame !== "terminal-current-26-825-closed" &&
          frame !== "terminal-current-closed" &&
          frame !== "terminal-current-background-list" &&
          frame !== "terminal-current-background-open" &&
          frame !== "terminal-closed"),
    );
    setTerminalSessionIds([...nextTerminalSessionIds]);
    terminalSessionCounterRef.current =
      nextTerminalSessionIds.filter((sessionId) =>
        sessionId.startsWith("local-terminal-"),
      ).length + 1;
    setClosedTerminalSessionIds([...nextClosedTerminalSessionIds]);
    setTerminalWorkspaceBySession(
      initialTerminalWorkspaceLabels(nextId, frame),
    );
    setDismissedTerminalMismatchIds(new Set());
    setTerminalReloadPendingIds(new Set());
    setTerminalReloadSessionId(
      frame === "terminal-current-reload" ? "local-terminal-1" : null,
    );
    setTerminalTabPickerOpen(
      frame === "terminal-picker" ||
        frame === "terminal-current-26-825-picker",
    );
    setTerminalCommandId(nextTerminalSessionIds.at(-1) ?? null);
    setTerminalHeight(currentTerminal26825Frame(frame) ? 280 : 272);
    setBackgroundTerminalPanelWidth(381.4375);
    setBackgroundTerminalPanelOpen(
      nextId === "terminal-lifecycle" &&
        (frame === "terminal-current-background-list" ||
          frame === "terminal-current-background-open"),
    );
    setBackgroundTerminalRunning(true);
    setTerminalValuesByCommand({});
    setTerminalHistoryByCommand(initialTerminalHistory(nextId, frame));
    setUndoneFileIds(new Set());
    setLiveError(null);
    setShellNotificationVisible(false);
    setWorkspaceOverlay(null);
    setWorkspaceLocalEnvironmentOpen(false);
    setWorkspaceProjectQuery("");
    setWorkspaceBranchQuery("");
    setWorkspaceEnvironmentQuery("");
    dismissSidebarAfterNavigation();
  };

  const selectMode = (nextMode: "live" | "replay") => {
    cancelReplaySubmitTimer();
    setView("conversation");
    setMode(nextMode);
    setActiveFrame(null);
    setComposerValue("");
    setComposerOverlay(null);
    setComposerAttachments([]);
    setSubmittedComposerAttachments([]);
    setSubmittedComposerPrompt(null);
    setQueuedPrompts([]);
    setQueueingEnabled(true);
    setQueueInterrupted(false);
    setReplayComposerSubmitting(false);
    setReplayComposerStopped(false);
    setReplayQueuedContinuation(null);
    setReplayApprovalResolution(null);
    setReplaySessionApprovalScope(null);
    setThreadSummaryOpen(false);
    setSubagentPanelOpen(false);
    setActiveConversationSidePanel("review");
    setSelectedSubagentId(null);
    setWorkspaceOverlay(null);
    setWorkspaceLocalEnvironmentOpen(false);
  };

  const dismissComposerResources = () => {
    setComposerOverlay(null);
    if (!isCurrentAttachmentReplay) setActiveFrame(null);
    window.setTimeout(() => composerInputRef.current?.focus());
  };

  const respondToApproval = async (
    requestId: number | string,
    decision: "accept" | "acceptForSession" | "decline",
    scope: "once" | "similar" = "once",
  ) => {
    if (mode === "replay") {
      if (isCurrentApprovalReplay) {
        if (
          isCurrentApproval26820FileReplay ||
          isCurrentApproval26825FileReplay
        ) {
          const build = isCurrentApproval26825FileReplay ? "26-825" : "26-820";
          const nextFrame =
            decision === "decline"
              ? `approval-current-${build}-file-denied`
              : `approval-current-${build}-file-allowed`;
          setReplayApprovalResolution(null);
          setReplaySessionApprovalScope(
            decision === "acceptForSession" ? "session" : null,
          );
          setReplayCount(
            scenario.frames[nextFrame] ?? scenario.events.length,
          );
          setActiveFrame(nextFrame);
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (
          scenarioId === "approval-for-session" &&
          decision === "acceptForSession"
        ) {
          setReplaySessionApprovalScope("session");
          setReplayApprovalResolution(null);
          setReplayCount(
            scenario.frames["approval-current-session-first-completed"] ??
              scenario.events.length,
          );
          setActiveFrame("approval-current-session-first-completed");
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (
          scenarioId === "approval-for-session" &&
          decision === "accept"
        ) {
          setReplaySessionApprovalScope("once");
          setReplayApprovalResolution(null);
          setReplayCount(
            scenario.frames["approval-current-session-first-completed"] ??
              scenario.events.length,
          );
          setActiveFrame("approval-current-session-first-completed");
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (
          scenarioId === "approval-for-session" &&
          decision === "decline"
        ) {
          setReplaySessionApprovalScope(null);
          setReplayApprovalResolution({
            decision: "rejected",
            requestId,
          });
          setActiveFrame("approval-current-session-denied");
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (decision === "accept" && scope === "similar") {
          if (scenarioId !== "approval-similar-commands") {
            selectScenario(
              "approval-similar-commands",
              "approval-current-similar-first-completed",
            );
          } else {
            setReplayApprovalResolution(null);
            setReplayCount(
              scenario.frames[
                "approval-current-similar-first-completed"
              ] ?? scenario.events.length,
            );
            setActiveFrame("approval-current-similar-first-completed");
          }
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (
          scenarioId === "approval-similar-commands" &&
          decision === "accept"
        ) {
          selectScenario(
            "approval-allow-once",
            "approval-current-allow-once-completed",
          );
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (scenarioId === "approval-allow-once" && decision === "accept") {
          setReplayApprovalResolution(null);
          setReplayCount(scenario.events.length);
          setActiveFrame("approval-current-allow-once-completed");
          requestAnimationFrame(() => composerInputRef.current?.focus());
          return;
        }
        if (decision === "decline") {
          if (
            scenarioId === "approval-allow-once" ||
            scenarioId === "approval-similar-commands"
          ) {
            selectScenario("approval-denied", "approval-current-denied");
            requestAnimationFrame(() => composerInputRef.current?.focus());
            return;
          }
          setReplayApprovalResolution(null);
          setReplayCount(scenario.events.length);
          setActiveFrame("approval-current-denied");
        } else {
          setReplayApprovalResolution({
            decision: "approved",
            requestId,
          });
          setReplayCount(scenario.events.length);
          setActiveFrame(null);
        }
        return;
      }
      if (decision === "accept" || decision === "acceptForSession") {
        setReplayApprovalResolution(null);
        setReplayCount(scenario.events.length);
        setActiveFrame(null);
      } else {
        setReplayApprovalResolution({
          decision: "rejected",
          requestId,
        });
        setActiveFrame("approval-rejected");
      }
      return;
    }
    const submissionGate = liveApprovalSubmissionGateRef.current;
    if (!submissionGate.begin(requestId)) return;
    try {
      await window.codexDemo?.respondToApproval({ decision, requestId });
      dispatchLive({
        decision: decision === "decline" ? "rejected" : "approved",
        kind: "approval-resolution",
        requestId,
        responseDecision: decision,
      });
    } catch (error) {
      submissionGate.finish(requestId);
      setLiveError(error instanceof Error ? error.message : String(error));
    }
  };

  const submitLive = async (prompt: string) => {
    if (!window.codexDemo) {
      setLiveError("Live mode is available in the Electron app.");
      return;
    }
    if (liveStartPendingRef.current) return;
    liveStartPendingRef.current = true;
    setLiveStartPending(true);
    setMode("live");
    setLiveError(null);
    try {
      await window.codexDemo.startLive({ prompt });
      setComposerValue((current) => (current === prompt ? "" : current));
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : String(error));
    } finally {
      liveStartPendingRef.current = false;
      setLiveStartPending(false);
    }
  };

  const stopLive = async () => {
    try {
      await window.codexDemo?.stopLive();
    } catch (error) {
      setLiveError(error instanceof Error ? error.message : String(error));
    } finally {
      liveState.approvals
        .filter(({ decision }) => decision === "pending")
        .forEach(({ requestId }) => {
          dispatchLive({
            decision: "rejected",
            kind: "approval-resolution",
            requestId,
          });
        });
    }
  };

  const restoreConversationRunningReplay = () => {
    setReplayComposerStopped(false);
    setReplayQueuedContinuation(null);
    setQueueInterrupted(false);
    setReplayCount(
      replayScenarios["conversation-lifecycle"].frames[
        "conversation-running"
      ] ?? replayScenarios["conversation-lifecycle"].events.length,
    );
  };

  const startReplayCompaction = () => {
    if (!isCurrentContextCompactionReplay || state.status === "running") {
      return;
    }
    cancelReplaySubmitTimer();
    setComposerValue("");
    setComposerOverlay(null);
    const repeated =
      activeFrame === "context-compaction-recovered" ||
      activeFrame?.startsWith("context-compaction-repeated-");
    const runningFrame = repeated
      ? "context-compaction-repeated-running"
      : "context-compaction-running";
    const completedFrame = repeated
      ? "context-compaction-repeated-completed"
      : "context-compaction-completed";
    setReplayCount(
      replayScenarios.compaction.frames[runningFrame] ??
        replayScenarios.compaction.events.length,
    );
    setActiveFrame(runningFrame);
    replaySubmitTimerRef.current = window.setTimeout(() => {
      replaySubmitTimerRef.current = null;
      setReplayCount(
        replayScenarios.compaction.frames[completedFrame] ??
          replayScenarios.compaction.events.length,
      );
      setActiveFrame(completedFrame);
      requestAnimationFrame(() => composerInputRef.current?.focus());
    }, 900);
  };

  const stopReplayCompaction = () => {
    cancelReplaySubmitTimer();
    setReplayComposerSubmitting(false);
    setReplayCount(
      replayScenarios.compaction.frames["context-compaction-ready"] ??
        replayScenarios.compaction.events.length,
    );
    setActiveFrame("context-compaction-ready");
    setComposerValue("");
    requestAnimationFrame(() => composerInputRef.current?.focus());
  };

  const attachmentSubmissionReady =
    composerAttachments.length > 0 &&
    composerAttachments.every(({ status }) => status === "ready");

  const submitComposer = (prompt: string) => {
    if (isCurrentAttachmentReplay) {
      if (!attachmentSubmissionReady) return;
      cancelReplaySubmitTimer();
      setSubmittedComposerAttachments(
        composerAttachments.map((attachment) => ({ ...attachment })),
      );
      setSubmittedComposerPrompt(prompt);
      setReplayComposerSubmitting(true);
      setComposerOverlay(null);
      setActiveFrame("attachment-submitting");
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setReplayCount(scenario.events.length);
        setActiveFrame("attachment-completed");
        setComposerAttachments([]);
        completeReplayComposerSubmission();
        setComposerValue((current) => (current === prompt ? "" : current));
      }, 160);
      return;
    }
    if (
      isCurrentApprovalSimilarReplay &&
      activeFrame === "approval-current-similar-first-completed"
    ) {
      cancelReplaySubmitTimer();
      setReplayComposerSubmitting(true);
      setComposerOverlay(null);
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setReplayCount(scenario.events.length);
        setActiveFrame("approval-current-similar-repeated-completed");
        completeReplayComposerSubmission();
        setComposerValue((current) => (current === prompt ? "" : current));
      }, 160);
      return;
    }
    if (isCurrentApprovalSessionReplay) {
      if (
        activeFrame !== "approval-current-session-first-completed" ||
        replaySessionApprovalScope !== "session"
      ) {
        return;
      }
      cancelReplaySubmitTimer();
      setReplayComposerSubmitting(true);
      setComposerOverlay(null);
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setReplayCount(scenario.events.length);
        setActiveFrame("approval-current-session-repeated-completed");
        completeReplayComposerSubmission();
        setComposerValue((current) => (current === prompt ? "" : current));
      }, 160);
      return;
    }
    if (isCurrentContextCompactionReplay) {
      if (state.status === "running") return;
      if (prompt.trim() === "/compact") {
        startReplayCompaction();
        return;
      }
      if (state.compaction !== "completed") return;
      cancelReplaySubmitTimer();
      setReplayComposerSubmitting(true);
      setComposerOverlay(null);
      const recoveredFrame =
        activeFrame === "context-compaction-repeated-completed"
          ? "context-compaction-repeated-recovered"
          : "context-compaction-recovered";
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setReplayCount(
          replayScenarios.compaction.frames[recoveredFrame] ??
            replayScenarios.compaction.events.length,
        );
        setActiveFrame(recoveredFrame);
        completeReplayComposerSubmission();
        setComposerValue((current) => (current === prompt ? "" : current));
      }, 160);
      return;
    }
    if (isCurrentCommandInterruptionReplay) {
      if (activeFrame !== "command-interruption-settled") return;
      cancelReplaySubmitTimer();
      setReplayComposerSubmitting(true);
      setComposerOverlay(null);
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setReplayCount(
          replayScenarios.interruption.frames[
            "command-interruption-recovered"
          ] ?? replayScenarios.interruption.events.length,
        );
        setActiveFrame("command-interruption-recovered");
        completeReplayComposerSubmission();
        setComposerValue((current) => (current === prompt ? "" : current));
      }, 160);
      return;
    }
    if (!isConversationLifecycle) {
      void submitLive(prompt);
      return;
    }
    setActiveFrame(null);
    setComposerOverlay(null);
    setComposerAttachments([]);
    if (replayComposerRunning) {
      if (queueingEnabled) {
        queuedPromptCounterRef.current += 1;
        setQueuedPrompts((items) => [
          ...items,
          {
            id: `queued-lifecycle-${queuedPromptCounterRef.current}`,
            text: prompt,
          },
        ]);
        setComposerValue("");
      } else {
        restoreConversationRunningReplay();
        setComposerValue("");
      }
      return;
    }
    cancelReplaySubmitTimer();
    setReplayComposerSubmitting(true);
    setReplayComposerStopped(false);
    setReplayQueuedContinuation(null);
    setQueueInterrupted(false);
    replaySubmitTimerRef.current = window.setTimeout(() => {
      replaySubmitTimerRef.current = null;
      setReplayCount(
        replayScenarios["conversation-lifecycle"].frames[
          "conversation-running"
        ] ?? replayScenarios["conversation-lifecycle"].events.length,
      );
      setReplayComposerSubmitting(false);
      setComposerValue((current) => (current === prompt ? "" : current));
    }, 160);
  };

  const settleCurrentCommandInterruption = () => {
    if (!isCurrentCommandInterruptionReplay) return;
    cancelReplaySubmitTimer();
    setReplayCount(
      replayScenarios.interruption.frames[
        "command-interruption-settled"
      ] ?? replayScenarios.interruption.events.length,
    );
    setActiveFrame("command-interruption-settled");
  };

  const stopComposer = () => {
    if (currentComposerQueue26825Replay) {
      cancelReplaySubmitTimer();
      setCurrentQueue26825Phase("paused");
      setQueueInterrupted(true);
      setReplayComposerStopped(true);
      setActiveFrame("workspace-composer-current-26-825-queue-paused");
      return;
    }
    if (isCurrentContextCompactionReplay) {
      stopReplayCompaction();
      return;
    }
    if (isCurrentCommandInterruptionReplay) {
      cancelReplaySubmitTimer();
      setReplayComposerSubmitting(false);
      setReplayCount(
        replayScenarios.interruption.frames[
          "command-interruption-stopping"
        ] ?? replayScenarios.interruption.events.length,
      );
      setActiveFrame("command-interruption-stopping");
      return;
    }
    if (!isConversationLifecycle) {
      void stopLive();
      return;
    }
    cancelReplaySubmitTimer();
    setReplayComposerSubmitting(false);
    const [nextQueuedPrompt, ...remainingQueuedPrompts] =
      queuedPrompts;
    if (
      nextQueuedPrompt &&
      typeof nextQueuedPrompt.text === "string"
    ) {
      setReplayComposerStopped(false);
      setReplayQueuedContinuation(nextQueuedPrompt.text);
      setQueuedPrompts(remainingQueuedPrompts);
      setQueueInterrupted(false);
      return;
    }
    setReplayComposerStopped(true);
    setQueueInterrupted(false);
  };

  const resumeQueue = () => {
    if (currentComposerQueue26825Replay) {
      setCurrentQueue26825Phase("resume-ready");
      setQueueInterrupted(false);
      setReplayComposerStopped(true);
      setActiveFrame(
        "workspace-composer-current-26-825-queue-resume-ready",
      );
      requestAnimationFrame(() => composerInputRef.current?.focus());
      return;
    }
    restoreConversationRunningReplay();
    setQueuedPrompts((items) =>
      items.map((item) => ({ ...item, status: "queued" })),
    );
  };

  const resumeCurrentQueuePrimary = () => {
    if (!currentComposerQueue26825Replay) return;
    cancelReplaySubmitTimer();
    setCurrentQueue26825Phase("resumed");
    setQueueInterrupted(false);
    setReplayComposerStopped(false);
    setActiveFrame("workspace-composer-current-26-825-queue-resumed");
    replaySubmitTimerRef.current = window.setTimeout(() => {
      setCurrentQueue26825Phase("continued");
      setQueuedPrompts([]);
      setActiveFrame("workspace-composer-current-26-825-queue-continued");
      replaySubmitTimerRef.current = window.setTimeout(() => {
        replaySubmitTimerRef.current = null;
        setCurrentQueue26825Phase("settled");
        setActiveFrame("workspace-composer-current-26-825-queue-settled");
        requestAnimationFrame(() => composerInputRef.current?.focus());
      }, 600);
    }, 1_000);
  };

  const removeQueuedPrompt = (id: string) => {
    const nextItems = queuedPrompts.filter((item) => item.id !== id);
    setQueuedPrompts(nextItems);
    if (nextItems.length === 0) {
      setQueueInterrupted(false);
      if (currentComposerQueue26825Replay) {
        setCurrentQueue26825Phase("settled");
        setReplayComposerStopped(true);
        setActiveFrame("workspace-composer-current-26-825-queue-settled");
      }
    }
  };

  const deleteQueuedPrompt = removeQueuedPrompt;

  const editQueuedPrompt = (id: string) => {
    const item = queuedPrompts.find((candidate) => candidate.id === id);
    if (item && typeof item.text === "string") setComposerValue(item.text);
    removeQueuedPrompt(id);
  };

  const sendQueuedPromptNow = (id: string) => {
    if (currentComposerQueue26825Replay) {
      deleteQueuedPrompt(id);
      setCurrentQueue26825Phase("continued");
      setReplayComposerStopped(false);
      setActiveFrame("workspace-composer-current-26-825-queue-continued");
      return;
    }
    deleteQueuedPrompt(id);
    restoreConversationRunningReplay();
  };

  const reorderQueuedPrompts = (activeId: string, overId: string) => {
    setQueuedPrompts((items) => {
      const activeIndex = items.findIndex(({ id }) => id === activeId);
      const overIndex = items.findIndex(({ id }) => id === overId);
      if (activeIndex < 0 || overIndex < 0) return items;
      const next = [...items];
      const [active] = next.splice(activeIndex, 1);
      if (!active) return items;
      next.splice(overIndex, 0, active);
      return next;
    });
  };

  const legacyWindowedFrame =
    isConversationLifecycle && activeFrame === "thread-windowed";
  const current26825LongFrame =
    isConversationLifecycle && current26825LongThreadFrame(activeFrame);
  const current26820HeaderFrame =
    current26825LongFrame ||
    isCurrentApproval26820FileReplay ||
    isCurrentMcp26820Replay ||
    isCurrentCommandReplay;
  const currentWindowedFrame = legacyWindowedFrame || current26825LongFrame;
  const reverseOriginThread =
    currentWindowedFrame ||
    isCurrentLongCommandReplay ||
    isCurrentCommandFailureReplay ||
    isCurrentCommandInterruptionReplay ||
    isCurrentCommandReplay ||
    isCurrentRichMarkdownStreamingReplay;
  const windowedHistorySize = current26825LongFrame
    ? current26825LongHistorySize
    : currentWindowedHistorySize;
  const windowedTurnWindowSize = current26825LongFrame
    ? threadFollowing
      ? 8
      : activeFrame === "thread-current-26-825-compact-away"
        ? 9
        : 12
    : currentWindowedTurnWindowSize;

  const returnToLatest = useCallback(() => {
    const viewport = threadViewportRef.current;
    if (!viewport) return;
    if (currentWindowedFrame) {
      if (
        current26825LongFrame &&
        windowedSelectedMessageIndex < current26825LongReturnIndex
      ) {
        setWindowedSelectedMessageIndex(current26825LongReturnIndex);
        setThreadFollowing(false);
        viewport.scrollTo({ behavior: "smooth", top: -402 });
        return;
      }
      setWindowedSelectedMessageIndex(windowedHistorySize - 1);
      if (current26825LongFrame) setThreadFollowing(true);
    }
    viewport.scrollTo({
      behavior: "smooth",
      top: reverseOriginThread ? 0 : viewport.scrollHeight,
    });
  }, [
    current26825LongFrame,
    currentWindowedFrame,
    reverseOriginThread,
    windowedHistorySize,
    windowedSelectedMessageIndex,
  ]);

  useLayoutEffect(() => {
    if (scenarioSelectionVersion === 0) return;
    const viewport = threadViewportRef.current;
    if (!viewport) return;
    let resetFrame = 0;
    const layoutFrame = window.requestAnimationFrame(() => {
      resetFrame = window.requestAnimationFrame(() => {
        viewport.scrollTop = activeFrame === "thread-windowed"
          ? -28_484
          : activeFrame === "thread-current-26-825-middle"
            ? -2_394
            : activeFrame === "thread-current-26-825-compact-away"
              ? -968
              : viewport.scrollHeight;
        viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
      });
    });
    return () => {
      window.cancelAnimationFrame(layoutFrame);
      window.cancelAnimationFrame(resetFrame);
    };
  }, [activeFrame, scenarioSelectionVersion]);

  const scrollToMessage = useCallback(
    (id: string, behavior: "instant" | "smooth") => {
      const viewport = threadViewportRef.current;
      const target = viewport
        ? [...viewport.querySelectorAll<HTMLElement>("[data-item-id]")].find(
            (candidate) => candidate.dataset.itemId === id,
          )
        : undefined;
      if (!target) return false;
      viewport?.dispatchEvent(new Event("pointerdown"));
      target.scrollIntoView({ behavior, block: "center" });
      return true;
    },
    [],
  );

  useLayoutEffect(() => {
    if (!currentWindowedFrame) return;
    const viewport = threadViewportRef.current;
    if (!viewport) return;
    let alignmentFrame = 0;
    let scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = window.requestAnimationFrame(() => {
        const messagesAfter =
          windowedHistorySize - 1 - windowedSelectedMessageIndex;
        const distanceFromLatest = messagesAfter === 0
          ? 0
          : current26825LongFrame
            ? activeFrame === "thread-current-26-825-middle" &&
                windowedSelectedMessageIndex === current26825LongMiddleIndex
              ? 2_394
              : windowedSelectedMessageIndex === current26825LongReturnIndex
              ? 402
              : activeFrame === "thread-current-26-825-compact-away" &&
                  windowedSelectedMessageIndex === current26825LongCompactIndex
                ? 968
              : messagesAfter * 148 + 126
            : messagesAfter * 672 + 320;
        viewport.scrollTop = -Math.min(
          viewport.scrollHeight - viewport.clientHeight,
          distanceFromLatest,
        );
        alignmentFrame = window.requestAnimationFrame(() => {
          const selectedTurn = viewport.querySelector<HTMLElement>(
            `[data-windowed-turn="${windowedSelectedMessageIndex + 1}"]`,
          );
          if (selectedTurn && messagesAfter > 0 && !current26825LongFrame) {
            const viewportBounds = viewport.getBoundingClientRect();
            const selectedBounds = selectedTurn.getBoundingClientRect();
            viewport.scrollTop +=
              selectedBounds.top -
              (viewportBounds.top + (current26825LongFrame ? 196 : 180));
          }
          viewport.dispatchEvent(new Event("scroll", { bubbles: true }));
        });
      });
    });
    return () => {
      window.cancelAnimationFrame(scrollFrame);
      window.cancelAnimationFrame(alignmentFrame);
    };
  }, [
    activeFrame,
    current26825LongFrame,
    currentWindowedFrame,
    windowedHistorySize,
    windowedSelectedMessageIndex,
  ]);

  const lastEvent = scenario.events[Math.max(0, replayCount - 1)];
  const currentSidebarComposition =
    initialSelection.currentSidebar ||
    initialSelection.frame?.startsWith("sidebar-current") ||
    !initialSelection.capture;
  const currentSidebarThreadLifecycle =
    initialSelection.sidebarState === "thread-lifecycle-current";
  const currentSidebarWorktreeLifecycle =
    initialSelection.sidebarState === "worktree-lifecycle-current";
  const currentWorktreeSetup = currentWorktreeSetupFrame(activeFrame);
  const currentWorktreeSetupSelectedSidebarIndex =
    currentWorktreeSetupPhase === "failed"
      ? 1
      : currentWorktreeSetupPhase === "created"
        ? 2
        : 0;
  const currentWorktreeSetupSteps: readonly WorktreeSetupStep[] =
    currentWorktreeSetupPhase === "failed"
      ? [
          {
            id: "preparing-workspace",
            label: "Preparing workspace",
            status: "completed",
          },
          {
            id: "checking-out-files",
            label: "Checking out files",
            status: "failed",
          },
        ]
      : currentWorktreeSetupStage === "checkout"
        ? [
            {
              id: "preparing-workspace",
              label: "Preparing workspace",
              status: "completed",
            },
            {
              id: "checking-out-files",
              label: "Checking out files",
              status: "in-progress",
            },
          ]
        : [
            {
              id: "preparing-workspace",
              label: "Preparing workspace",
              status: "in-progress",
            },
            {
              id: "checking-out-files",
              label: "Checking out files",
              status: "pending",
            },
          ];
  const currentHomeFrame = activeFrame?.startsWith("current-home-") ?? false;
  const workspacePersistenceFrame =
    view === "workspace" && currentWorkspacePersistenceFrame(activeFrame);
  const sidebarRecentScenarios = (
    Object.values(replayScenarios) as ReplayScenario[]
  ).slice(
    0,
    initialSelection.sidebarState === "collection-long-list"
      ? 12
      : currentSidebarComposition
        ? 6
        : undefined,
  );
  const currentSidebarVisibleProjects =
    currentSidebarWorktreeLifecycle
      ? [
          {
            id: "codex-ui-kit",
            label: "codex-ui-kit",
            tasks: currentSidebarWorktreeTasks,
          },
        ]
      : initialSelection.sidebarState === "collection-empty"
      ? [
          {
            id: "protocol-client",
            label: "codex-app-server-client",
            tasks: [] as string[],
          },
        ]
      : currentSidebarProjects;
  const sidebarRecentItems = sidebarRecentScenarios.map((item, index) => (
    <AppSidebarItem
      actions={
        currentSidebarComposition ? (
          <>
            <button
              aria-label={
                currentSidebarThreadLifecycle
                  ? "Pin chat"
                  : `Pin recent task ${item.id}`
              }
              type="button"
            >
              <SidebarGlyph name="pin-current" />
            </button>
            <button
              aria-label={
                currentSidebarThreadLifecycle
                  ? "Archive chat"
                  : `Archive recent task ${item.id}`
              }
              type="button"
            >
              <SidebarGlyph name="archive-current" />
            </button>
          </>
        ) : (
          <button
            aria-label={`Sidebar actions for ${item.label}`}
            type="button"
          >
            <SidebarGlyph name="more" />
          </button>
        )
      }
      actionsLabel={
        currentSidebarThreadLifecycle
          ? "Chat actions"
          : `Sidebar task actions for ${item.label}`
      }
      data-sidebar-status-fixture={
        currentSidebarThreadLifecycle
          ? index === 0
            ? "current-thread-active"
            : index === 1
              ? "current-thread-unread"
              : undefined
          : undefined
      }
      data-sidebar-thread-lifecycle-fixture={
        currentSidebarThreadLifecycle
          ? index === 0
            ? "active"
            : index === 1
              ? "unread"
              : "idle"
          : undefined
      }
      key={item.id}
      leading={
        currentSidebarComposition ? undefined : (
          <SidebarGlyph name="thread" />
        )
      }
      onClick={() => selectScenario(item.id)}
      selected={
        currentSidebarThreadLifecycle
          ? index === 0
          : !currentSidebarComposition &&
            view === "conversation" &&
            mode === "replay" &&
            scenarioId === item.id
      }
      status={
        currentSidebarThreadLifecycle
          ? index === 0
            ? "active"
            : index === 1
              ? "unread"
              : "idle"
          : currentSidebarComposition
          ? "idle"
          : index === 1
            ? "queued"
            : index === 2
              ? "error"
              : index === 3
                ? "unread"
                : "idle"
      }
      statusLabel={
        currentSidebarThreadLifecycle
          ? index === 0
            ? "Chat is running"
            : index === 1
              ? "Chat has an unread update"
              : undefined
          : currentSidebarComposition
          ? undefined
          : index === 1
            ? "Task queued"
            : index === 2
              ? "Task failed"
              : index === 3
                ? "Unread update"
                : undefined
      }
    >
      {item.label}
    </AppSidebarItem>
  ));
  const sidebar = (
    <AppSidebar
      footer={
        <AppSidebarFooter
          account="Demo account"
          accountAvatar={<span className="demo-sidebar-avatar">D</span>}
          renderAccountTrigger={(trigger) => (
            <Menu
              align="start"
              className="demo-current-sidebar-menu demo-current-sidebar-account-menu"
              initialFocus="content"
              label="Account menu"
              onOpenChange={(open) => {
                setCurrentSidebarAccountMenuOpen(open);
                if (open) setCurrentSidebarHelpMenuOpen(false);
              }}
              open={currentSidebarAccountMenuOpen}
              side="top"
              sideOffset={currentHomeFrame ? 7.125 : 7.5}
              style={{
                width: currentHomeFrame
                  ? 305.875
                  : "calc(var(--codex-ui-app-sidebar-width) - 1rem)",
              }}
              trigger={trigger}
              width="auto"
            >
              <MenuItem
                className="demo-current-sidebar-account-menu__identity"
                startIcon={
                  <img
                    alt=""
                    className="demo-current-sidebar-account-menu__avatar"
                    src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='18' height='18' viewBox='0 0 18 18'%3E%3Ccircle cx='9' cy='9' r='9' fill='%230c7faa'/%3E%3Ctext x='9' y='12' text-anchor='middle' font-family='system-ui' font-size='8' fill='white'%3ED%3C/text%3E%3C/svg%3E"
                  />
                }
              >
                Demo account
              </MenuItem>
              <div
                aria-hidden="true"
                className="demo-current-sidebar-account-menu__divider"
              >
                <span />
              </div>
              <MenuItem
                shortcut="94% left"
                startIcon={
                  <CurrentBuildIcon name="sidebar-account-menu-usage" />
                }
              >
                Usage
              </MenuItem>
              <MenuItem
                startIcon={
                  <CurrentBuildIcon name="sidebar-account-menu-pet" />
                }
              >
                Show pet
              </MenuItem>
              <MenuItem
                startIcon={
                  <CurrentBuildIcon name="sidebar-account-menu-invite" />
                }
              >
                Invite a friend
              </MenuItem>
              <MenuItem
                shortcut="⌘,"
                startIcon={
                  <CurrentBuildIcon name="sidebar-account-menu-settings" />
                }
              >
                Settings
              </MenuItem>
              <MenuItem
                startIcon={
                  <CurrentBuildIcon name="sidebar-account-menu-logout" />
                }
              >
                Log out
              </MenuItem>
            </Menu>
          )}
          actions={
            currentSidebarComposition ? (
              <>
                <button
                  aria-label="Start new voice chat"
                  className="demo-current-sidebar-voice"
                  type="button"
                >
                  <CurrentBuildIcon name="sidebar-voice" />
                  <span>Voice</span>
                </button>
                <Menu
                  align="start"
                  className="demo-current-sidebar-menu demo-current-sidebar-help-menu"
                  label="Help menu"
                  onOpenChange={(open) => {
                    setCurrentSidebarHelpMenuOpen(open);
                    if (open) setCurrentSidebarAccountMenuOpen(false);
                  }}
                  open={currentSidebarHelpMenuOpen}
                  side="top"
                  sideOffset={7}
                  style={{ width: 320 }}
                  trigger={
                    <button aria-label="Open help menu" type="button">
                      <SidebarGlyph name="help-current" />
                    </button>
                  }
                  width="auto"
                >
                <div className="demo-current-sidebar-help-menu__heading">
                  What&apos;s new
                </div>
                <div className="demo-current-sidebar-help-menu__releases">
                  <MenuItem
                    shortcut="13 Aug"
                    startIcon={
                      <CurrentBuildIcon name="sidebar-help-menu-release-note" />
                    }
                  >
                    Computer History
                  </MenuItem>
                  <MenuItem
                    shortcut="11 Aug"
                    startIcon={
                      <CurrentBuildIcon name="sidebar-help-menu-release-note" />
                    }
                  >
                    Linux desktop preview and agent imports
                  </MenuItem>
                  <MenuItem
                    shortcut="31 Jul"
                    startIcon={
                      <CurrentBuildIcon name="sidebar-help-menu-release-note" />
                    }
                  >
                    Record &amp; Replay expands to the EU, UK, and Switzerland
                  </MenuItem>
                </div>
                <MenuItem
                  endIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-changelog-external" />
                  }
                  startIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-changelog" />
                  }
                >
                  Full changelog
                </MenuItem>
                <MenuSeparator />
                <MenuItem
                  startIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-chrome" />
                  }
                >
                  Set up Chrome extension
                </MenuItem>
                <MenuItem
                  startIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-remote" />
                  }
                >
                  Set up remote
                </MenuItem>
                <MenuItem
                  startIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-keyboard" />
                  }
                >
                  Keyboard shortcuts
                </MenuItem>
                <MenuItem
                  startIcon={
                    <CurrentBuildIcon name="sidebar-help-menu-support" />
                  }
                >
                  Help
                </MenuItem>
                </Menu>
              </>
            ) : (
              <button aria-label="Open settings" type="button">
                <SidebarGlyph name="settings" />
              </button>
            )
          }
        />
      }
      header={currentSidebarComposition ? (
        <div className="demo-sidebar-header">
          <div className="demo-sidebar-brand-row">
            <button
              aria-expanded={false}
              aria-haspopup="menu"
              className="demo-sidebar-brand"
              type="button"
            >
              Codex
              <CurrentBuildIcon name="sidebar-mode-chevron" />
            </button>
            <span className="demo-sidebar-brand-actions">
              <button
                aria-label="Search"
                className="demo-sidebar-header-action"
                type="button"
              >
                <SidebarGlyph name="search" />
              </button>
              <button
                aria-label="View activity, needs attention"
                className="demo-sidebar-header-action"
                type="button"
              >
                <SidebarGlyph name="activity-attention" />
              </button>
            </span>
          </div>
          <div className="demo-sidebar-new-chat-row">
            <button
              aria-current={
                view === "workspace" &&
                !workspacePersistenceFrame &&
                !projectIndexChat
                  ? "page"
                  : undefined
              }
              className="demo-sidebar-new-chat"
              onClick={() => openWorkspace()}
              type="button"
            >
              <SidebarGlyph name="new" />
              <span>New chat</span>
            </button>
            <button
              aria-label="Quick chat"
              className="demo-sidebar-quick-chat"
              type="button"
            >
              <SidebarGlyph name="quick" />
            </button>
          </div>
        </div>
      ) : (
        <div className="demo-sidebar-header">
          <div className="demo-sidebar-brand-row">
            <button
              aria-expanded={false}
              aria-haspopup="menu"
              className="demo-sidebar-brand"
              type="button"
            >
              Codex
              <CurrentBuildIcon name="sidebar-mode-chevron" />
            </button>
            <button
              aria-label="Search"
              className="demo-sidebar-header-action"
              type="button"
            >
              <SidebarGlyph name="search" />
            </button>
          </div>
          <AppSidebarItem
            leading={<SidebarGlyph name="new" />}
            onClick={() => openWorkspace()}
          >
            New chat
          </AppSidebarItem>
        </div>
      )}
      primaryNavigation={
        usesCurrent26825ThreadHeader ||
        isCurrentCitations26825Replay ||
        isCurrentPullRequestRouteReplay ? (
          <>
            <AppSidebarItem
              leading={<SidebarGlyph name="pull-request" />}
              onClick={() => {
                setMode("replay");
                setView("pull-request");
                setPullRequestOpen(!isNarrowDemoWindow());
                dismissSidebarAfterNavigation();
              }}
              selected={view === "pull-request"}
            >
              Pull requests
            </AppSidebarItem>
            <AppSidebarItem leading={<SidebarGlyph name="automation" />}>
              Scheduled
            </AppSidebarItem>
            <AppSidebarItem leading={<SidebarGlyph name="plugins-current" />}>
              Plugins
            </AppSidebarItem>
            <AppSidebarItem leading={<SidebarGlyph name="explore-current" />}>
              Explore
            </AppSidebarItem>
          </>
        ) : (
        <>
          <AppSidebarItem
            leading={<SidebarGlyph name="pull-request" />}
            onClick={() => {
              setMode("replay");
              setView("pull-request");
              setPullRequestOpen(!isNarrowDemoWindow());
              dismissSidebarAfterNavigation();
            }}
            selected={view === "pull-request" || view === "shell"}
          >
            Pull requests
          </AppSidebarItem>
          <AppSidebarItem leading={<SidebarGlyph name="sites" />}>
            Sites
          </AppSidebarItem>
          <AppSidebarItem leading={<SidebarGlyph name="automation" />}>
            Scheduled
          </AppSidebarItem>
          <AppSidebarItem leading={<SidebarGlyph name="plugins-current" />}>
            Plugins
          </AppSidebarItem>
        </>
        )
      }
      titlebarInset
    >
      {initialSelection.sidebarState === "collection-loading" ? (
        <AppSidebarCollection
          data-sidebar-collection-fixture="loading"
          isLoading
          loadingLabel="Loading chats"
        />
      ) : (
        <>
      <AppSidebarSection
        collapsible
        kind={currentSidebarWorktreeLifecycle ? "projects" : "pinned"}
        title={currentSidebarWorktreeLifecycle ? "Projects" : "Pinned"}
        toggleLabel={
          currentSidebarWorktreeLifecycle
            ? "Toggle projects"
            : "Toggle pinned tasks"
        }
      >
        {currentSidebarComposition ? (
          currentSidebarThreadLifecycle ? (
            sidebarRecentItems
          ) : (
            currentSidebarVisibleProjects.map((project) => (
            <AppSidebarProjectGroup
              actions={
                <>
                  <Menu
                    align="start"
                    className="demo-current-sidebar-menu demo-current-sidebar-project-menu"
                    label={`${project.label} project menu`}
                    onOpenChange={(open) =>
                      setCurrentSidebarProjectMenuId((current) =>
                        open
                          ? project.id
                          : current === project.id
                            ? null
                            : current,
                      )
                    }
                    open={currentSidebarProjectMenuId === project.id}
                    side="bottom"
                    sideOffset={2}
                    style={{
                      height: project.tasks.some(
                        (_task, taskIndex) =>
                          currentSidebarTaskStatus(project.id, taskIndex) ===
                          "unread",
                      )
                        ? 212
                        : 187,
                      width: 252,
                    }}
                    trigger={
                      <button
                        aria-label={`Project actions for ${project.label}`}
                        type="button"
                      >
                        <SidebarGlyph name="more-current" />
                      </button>
                    }
                    width="auto"
                  >
                    <MenuItem
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-unpin" />
                      }
                    >
                      Unpin
                    </MenuItem>
                    <MenuItem
                      className="demo-current-sidebar-project-menu__item--edit"
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-edit" />
                      }
                    >
                      Edit
                    </MenuItem>
                    <MenuSeparator />
                    <MenuSubmenu
                      label="Section"
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-section" />
                      }
                      submenuClassName="demo-current-sidebar-project-section-submenu"
                      submenuStyle={{ height: 34, width: 118 }}
                      submenuWidth="auto"
                    >
                      <MenuItem keepOpen>New section…</MenuItem>
                    </MenuSubmenu>
                    <MenuItem
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-worktree" />
                      }
                    >
                      Create permanent worktree
                    </MenuItem>
                    <MenuSeparator />
                    {project.tasks.some(
                      (_task, taskIndex) =>
                        currentSidebarTaskStatus(project.id, taskIndex) ===
                        "unread",
                    ) ? (
                      <MenuItem
                        startIcon={
                          <CurrentBuildIcon name="sidebar-project-menu-mark-read" />
                        }
                      >
                        Mark all as read
                      </MenuItem>
                    ) : null}
                    <MenuItem
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-archive" />
                      }
                    >
                      Archive chats
                    </MenuItem>
                    <MenuSeparator />
                    <MenuItem
                      className="demo-current-sidebar-project-menu__item--remove"
                      startIcon={
                        <CurrentBuildIcon name="sidebar-project-menu-remove" />
                      }
                    >
                      Remove project
                    </MenuItem>
                  </Menu>
                  <button
                    aria-label={`Start new chat in ${project.label}`}
                    type="button"
                  >
                    <SidebarGlyph name="new" />
                  </button>
                </>
              }
              actionsLabel={`${project.label} project actions`}
              expanded={currentSidebarExpandedProjectIds.has(project.id)}
              key={project.id}
              label={project.label}
              leading={<SidebarGlyph name="folder-current" />}
              selected={
                project.selected &&
                view === "conversation" &&
                mode === "replay"
              }
              status={
                initialSelection.sidebarState === "status-lifecycle" ||
                currentSidebarThreadLifecycle ||
                currentSidebarWorktreeLifecycle
                  ? "idle"
                  : project.selected &&
                      (hasActiveTurnWork(state) || isTurnActive(state.status))
                    ? "running"
                    : project.status
              }
              statusLabel={
                project.selected &&
                (hasActiveTurnWork(state) || isTurnActive(state.status))
                  ? "Current project is running"
                  : project.status
                    ? "Unread project update"
                    : undefined
              }
              onExpandedChange={(expanded) =>
                setCurrentSidebarExpandedProjectIds((current) => {
                  const next = new Set(current);
                  if (expanded) next.add(project.id);
                  else next.delete(project.id);
                  return next;
                })
              }
            >
              {project.tasks.length === 0 ? (
                <AppSidebarCollection
                  data-sidebar-collection-fixture="empty"
                  emptyState="No chats"
                />
              ) : [
                  ...project.tasks,
                  ...(workspacePersistedTaskAvailable &&
                  project.id === "codex-ui-kit" &&
                  !currentSidebarWorktreeLifecycle
                    ? ["Verify worktree persistence"]
                    : []),
                ].map((task, index) => (
                <AppSidebarItem
                  actions={
                    task === "Verify worktree persistence" ||
                    (initialSelection.sidebarState === "status-lifecycle" &&
                      project.id === "protocol-client" &&
                      index === 0) ? undefined : (
                      <>
                        <button
                          aria-label={
                            currentSidebarWorktreeLifecycle
                              ? "Pin chat"
                              : `Pin task ${project.id}-${index + 1}`
                          }
                          type="button"
                        >
                          <SidebarGlyph name="pin-current" />
                        </button>
                        <button
                          aria-label={
                            currentSidebarWorktreeLifecycle
                              ? "Archive chat"
                              : `Archive task ${project.id}-${index + 1}`
                          }
                          type="button"
                        >
                          <SidebarGlyph name="archive-current" />
                        </button>
                      </>
                    )
                  }
                  actionsLabel={
                    currentSidebarWorktreeLifecycle
                      ? "Chat actions"
                      : `${project.id} task actions`
                  }
                  data-sidebar-status-fixture={
                    currentSidebarWorktreeLifecycle
                      ? `current-worktree-${currentSidebar26825WorktreeFixture(index)}`
                      : initialSelection.sidebarState === "status-lifecycle"
                      ? `${project.id}:${index}`
                      : undefined
                  }
                  data-sidebar-worktree-status-fixture={
                    currentSidebarWorktreeLifecycle
                      ? `current-worktree-${currentSidebar26825WorktreeFixture(index)}`
                      : initialSelection.sidebarState === "status-lifecycle" &&
                          currentSidebarTaskWorktreeStatus(project.id, index)
                        ? `${project.id}:${index}`
                        : undefined
                  }
                  depth={1}
                  key={task}
                  onClick={
                    task === "Verify worktree persistence"
                      ? () => {
                          setMode("replay");
                          setView("workspace");
                          setWorkspacePage("conversation");
                          setActiveFrame(
                            workspaceDirectoryMissing
                              ? "workspace-directory-missing"
                              : "workspace-persisted-thread",
                          );
                          dismissSidebarAfterNavigation();
                        }
                      : undefined
                  }
                  selected={
                    (currentSidebarWorktreeLifecycle &&
                      index ===
                        (currentWorktreeSetup
                          ? currentWorktreeSetupSelectedSidebarIndex
                          : 0)) ||
                    (workspacePersistenceFrame &&
                      task === "Verify worktree persistence")
                  }
                  status={
                    task === "Verify worktree persistence"
                      ? "idle"
                      : currentSidebarWorktreeLifecycle
                        ? currentSidebar26825WorktreeItemStatus(index)
                      : initialSelection.sidebarState === "status-lifecycle"
                      ? currentSidebarTaskStatus(project.id, index)
                      : "idle"
                  }
                  statusLabel={
                    task === "Verify worktree persistence"
                      ? undefined
                      : currentSidebarWorktreeLifecycle
                        ? [
                            "Worktree is being set up",
                            "Worktree init failed",
                            "Task has an unread update",
                            undefined,
                          ][index]
                      : initialSelection.sidebarState === "status-lifecycle"
                      ? currentSidebarTaskStatusLabel(project.id, index)
                      : undefined
                  }
                  worktreeStatus={
                    task === "Verify worktree persistence"
                      ? "restored"
                      : currentSidebarWorktreeLifecycle
                        ? currentSidebar26825WorktreeStatus(index)
                      : initialSelection.sidebarState === "status-lifecycle"
                      ? currentSidebarTaskWorktreeStatus(project.id, index)
                      : undefined
                  }
                >
                  {task}
                </AppSidebarItem>
                ))}
            </AppSidebarProjectGroup>
            ))
          )
        ) : (
          <>
            <AppSidebarItem
              actions={
                <>
                  <button aria-label="Pin current task" type="button">
                    <SidebarGlyph name="pin" />
                  </button>
                  <button aria-label="Current task actions" type="button">
                    <SidebarGlyph name="more" />
                  </button>
                </>
              }
              actionsLabel="Current task actions"
              leading={<SidebarGlyph name="folder-current" />}
              status={
                hasActiveTurnWork(state) || isTurnActive(state.status)
                  ? "running"
                  : "idle"
              }
              statusLabel="Current task is running"
            >
              codex-ui-kit
            </AppSidebarItem>
            <AppSidebarItem
              actions={
                <button aria-label="Pinned task actions" type="button">
                  <SidebarGlyph name="more" />
                </button>
              }
              actionsLabel="Pinned task actions"
              depth={1}
              leading={<SidebarGlyph name="thread" />}
              onClick={() => selectScenario("mcp-current-success")}
              status="unread"
              statusLabel="Unread update"
            >
              MCP tool validation
            </AppSidebarItem>
          </>
        )}
      </AppSidebarSection>
      {currentSidebarWorktreeLifecycle ? null : (
      <AppSidebarSection
        actions={
          <span className="demo-sidebar-project-section-actions">
            <button
              aria-label="View projects"
              onClick={openProjectsIndex}
              type="button"
            >
              ›
            </button>
            <button
              aria-label="New project"
              onClick={() => void createProject("sidebar")}
              type="button"
            >
              +
            </button>
          </span>
        }
        collapsible
        defaultExpanded={false}
        kind="projects"
        title="Projects"
        toggleLabel="Toggle projects"
      >
        <AppSidebarItem
          leading={<SidebarGlyph name="folder-current" />}
          onClick={() => openWorkspace("codex-ui-kit")}
          selected={
            view === "workspace" &&
            workspaceProjectId === "codex-ui-kit"
          }
        >
          codex-ui-kit
        </AppSidebarItem>
        <AppSidebarItem
          leading={<SidebarGlyph name="folder-current" />}
          onClick={() => openWorkspace("app-server-client")}
          selected={
            view === "workspace" &&
            workspaceProjectId === "app-server-client"
          }
        >
          codex-app-server-client
        </AppSidebarItem>
        <AppSidebarItem
          leading={<SidebarGlyph name="folder-current" />}
          status="queued"
          statusLabel="Project task queued"
        >
          protocol-client-with-an-intentionally-long-worktree-name
        </AppSidebarItem>
      </AppSidebarSection>
      )}
      {projectCreationStatus === "error" &&
      projectCreationSource === "sidebar" ? (
        <p className="demo-sidebar-project-error" role="alert">
          Couldn&apos;t add that project
        </p>
      ) : null}
      <AppSidebarSection
        collapsible
        kind="threads"
        title="Recents"
        toggleLabel="Toggle recent tasks"
      >
        {currentSidebarThreadLifecycle
          ? null
          : initialSelection.sidebarState === "collection-long-list"
            ? (
                <AppSidebarCollection
                  data-sidebar-collection-fixture="long-list"
                  maxItems={5}
                >
                  {sidebarRecentItems}
                </AppSidebarCollection>
              )
            : sidebarRecentItems}
      </AppSidebarSection>
      <AppSidebarSection title="Connection">
        <AppSidebarItem
          disabled={!window.codexDemo}
          leading={<SidebarGlyph name="plugins" />}
          onClick={() => {
            selectMode("live");
            dismissSidebarAfterNavigation();
          }}
          selected={view === "conversation" && mode === "live"}
        >
          Live local
        </AppSidebarItem>
      </AppSidebarSection>
        </>
      )}
    </AppSidebar>
  );

  const composerIsRunning =
    mode === "live"
      ? isTurnActive(liveState.status)
      : (isConversationLifecycle && replayComposerRunning) ||
        (isCurrentPlan26825Replay && state.status === "running") ||
        (isCurrentReasoning26825Replay && state.status === "running") ||
        (isCurrentTransportRecoveryReplay && isTurnActive(state.status)) ||
        ((isCurrentCommandInterruptionReplay ||
          isCurrentCommandReplay ||
          isCurrentContextCompactionReplay ||
          isCurrentMixedToolReplay ||
          isCurrentSubagentReplay ||
          usesCurrentMcpFlatRows) &&
          state.status === "running");
  const composerIsDisabled =
    liveStartPending ||
    ((isConversationLifecycle ||
      isCurrentAttachmentReplay ||
      isCurrentCommandInterruptionReplay ||
      isCurrentCommandReplay ||
      isCurrentContextCompactionReplay) &&
      replayComposerSubmitting);
  const displayedStatus =
    isConversationLifecycle && replayComposerStopped
      ? "interrupted"
      : state.status === "retrying"
        ? "retrying"
      : composerIsRunning
        ? "running"
        : state.status;
  const subagentItems = useMemo<SubagentItem[]>(
    () =>
      state.subagents.map((subagent) =>
        presentSubagent(subagent, mode, subagentClockMs),
      ),
    [mode, state.subagents, subagentClockMs],
  );
  const selectedSubagent =
    subagentItems.find(({ id }) => id === selectedSubagentId) ?? null;
  const summarySubagentItems = useMemo(
    () =>
      subagentItems
        .map((item, index) => ({ index, item }))
        .sort((left, right) => {
          const leftTime = left.item.sortTimestampMs ?? Number.NaN;
          const rightTime = right.item.sortTimestampMs ?? Number.NaN;
          return Number.isFinite(leftTime) && Number.isFinite(rightTime)
            ? rightTime - leftTime || left.index - right.index
            : left.index - right.index;
        })
        .map(({ item }) => item),
    [subagentItems],
  );
  const activeSubagentCount = subagentItems.filter(
    ({ status }) => status !== "done",
  ).length;
  const completedSubagentCount =
    subagentItems.length - activeSubagentCount;
  const subagentSummaryLabel = [
    activeSubagentCount > 0 ? `${activeSubagentCount} working` : null,
    completedSubagentCount > 0 ? `${completedSubagentCount} done` : null,
  ]
    .filter(Boolean)
    .join(" ");
  const visibleSummarySubagents =
    activeSubagentCount > 0
      ? summarySubagentItems.filter(({ status }) => status !== "done")
      : summarySubagentItems;
  const openReviewPanel = () => {
    setActiveConversationSidePanel("review");
    setSubagentPanelOpen(false);
    setReviewOpen(true);
  };
  const openSubagentPanel = (subagentId?: string | null) => {
    setActiveConversationSidePanel("subagents");
    setReviewOpen(false);
    if (subagentId !== undefined) setSelectedSubagentId(subagentId);
    setSubagentPanelOpen(true);
  };
  const toggleSubagentPanel = () => {
    const opening =
      activeConversationSidePanel !== "subagents" || !subagentPanelOpen;
    setActiveConversationSidePanel("subagents");
    setReviewOpen(false);
    setSubagentPanelOpen(opening);
  };
  const composerPhase = composerIsDisabled
    ? "submitting"
    : composerIsRunning
      ? queuedPrompts.length > 0
        ? "queued"
        : "running"
      : queueInterrupted
        ? "queue-paused"
        : composerAttachments.length > 0 ||
            activeFrame === "composer-attachment"
          ? "attachment"
          : composerMode
            ? composerMode
            : composerValue.includes("\n")
              ? "multiline"
              : "idle";
  const currentHeaderReplay =
    mode === "replay" &&
    (isCurrentMcpReplay ||
      scenarioId === "mcp-tool-call" ||
      scenarioId === "mcp-recovery-mixed-thread" ||
      scenarioId === "attachment-lifecycle" ||
      isCurrentApproval26820FileReplay ||
      isCurrentAutomaticReviewReplay ||
      scenarioId === "long-command-output" ||
      scenarioId === "command-failure-recovery" ||
      scenarioId === "interruption" ||
      isCurrentCommandReplay ||
      scenarioId === "compaction" ||
      scenarioId === "context-summary" ||
      isAnyCurrentBasicMessageReplay ||
      isCurrentBrowser26825Replay ||
      isCurrentBrowserFailure26825Replay ||
      isCurrentCitations26825Replay ||
      isCurrentPlan26825Replay ||
      isCurrentReasoning26825Replay ||
      isCurrentSearch26825Replay ||
      isCurrentMarkdown26818Replay ||
      isCurrentMarkdown26825Replay ||
      isCurrentMarkdown26825MediaReplay ||
      isCurrentTransportRecoveryReplay ||
      isCurrentSubagentReplay ||
      current26825LongFrame ||
      scenarioId === "current-review-rename" ||
      isCurrentReviewFilesReplay ||
      isCurrentReview26825FilesReplay);
  const usesCurrentAskPermission =
    isCurrentApprovalReplay ||
    isCurrentAutomaticReviewReplay ||
    isCurrentAttachmentReplay ||
    isCurrentLongCommandReplay ||
    isCurrentCommandFailureReplay ||
    isCurrentCommandInterruptionReplay ||
    isCurrentContextSummaryReplay ||
    isLegacyTransportRecoveryReplay ||
    isCurrentMixedToolReplay ||
    isCurrentSubagentReplay ||
    scenarioId === "current-review-rename" ||
    isCurrentReviewFilesReplay;
  const availableComposerPermissionOptions =
    currentComposerControls26825Replay
      ? currentComposerPermissionOptions
      : composerPermissionOptions;
  const selectedComposerPermission =
    (usesCurrentAskPermission
      ? availableComposerPermissionOptions[0]
      : availableComposerPermissionOptions.find(
          ({ id }) => id === composerPermissionId,
        )) ?? availableComposerPermissionOptions[2]!;
  const header = (
    <ThreadHeader
      className={
        usesCurrent26825ThreadHeader ||
        isCurrentMcp26825Replay ||
        isCurrentCitations26825Replay
          ? "demo-current-basic-26-825-header"
          : undefined
      }
      endActions={
        usesCurrent26825ThreadHeader ||
        isCurrentMcp26825Replay ||
        isCurrentCitations26825Replay ? (
          <div className="demo-current-basic-26-825-header-actions">
            <button aria-label="Share" type="button">
              <CurrentBuildIcon name="thread-header-share" />
              <span>Share</span>
            </button>
            <button
              aria-label="Toggle summary"
              aria-pressed={
                isCurrentCitations26825Replay
                  ? citationSummaryOpen
                  : isCurrentMcp26825Replay
                  ? mcpSourceSummaryPinned
                  : undefined
              }
              onClick={
                isCurrentCitations26825Replay
                  ? () => setCitationSummaryOpen((open) => !open)
                  : isCurrentMcp26825Replay
                  ? () => {
                      if (mcpSourceSummaryOpen && mcpSourceSummaryPinned) {
                        setMcpSourceSummaryOpen(false);
                        setMcpSourceSummaryPinned(false);
                        return;
                      }
                      setMcpSourceSummaryOpen(true);
                      setMcpSourceSummaryPinned(true);
                    }
                  : undefined
              }
              ref={
                isCurrentMcp26825Replay || isCurrentCitations26825Replay
                  ? mcpSourceSummaryTriggerRef
                  : undefined
              }
              type="button"
            >
              <CurrentBuildIcon name="thread-header-summary" />
            </button>
            <button aria-label="Toggle bottom panel" type="button">
              <CurrentBuildIcon name="thread-header-bottom-panel" />
            </button>
            <button aria-label="Toggle side panel" type="button">
              <CurrentBuildIcon name="thread-header-side-panel" />
            </button>
          </div>
        ) : current26820HeaderFrame ? (
          <div className="demo-current-long-thread-header-actions">
            <button aria-label="Share thread" type="button">
              <span aria-hidden="true">↥</span>
              <span>Share</span>
            </button>
            <button
              aria-label={
                isCurrentMcp26820Replay
                  ? "Toggle pinned summary"
                  : "Thread settings"
              }
              aria-pressed={
                isCurrentMcp26820Replay
                  ? mcpSourceSummaryPinned
                  : undefined
              }
              onClick={
                isCurrentMcp26820Replay
                  ? () => {
                      if (mcpSourceSummaryOpen && mcpSourceSummaryPinned) {
                        setMcpSourceSummaryPinned(false);
                        return;
                      }
                      setMcpSourceSummaryOpen(true);
                      setMcpSourceSummaryPinned(true);
                    }
                  : undefined
              }
              ref={
                isCurrentMcp26820Replay
                  ? mcpSourceSummaryTriggerRef
                  : undefined
              }
              type="button"
            >
              <CurrentBuildIcon
                name={
                  isCurrentApproval26820FileReplay
                    ? "thread-header-actions"
                    : "thread-header-summary"
                }
              />
            </button>
            <button aria-label="Toggle bottom panel" type="button">
              <CurrentBuildIcon name="thread-header-bottom-panel" />
            </button>
            <button aria-label="Toggle side panel" type="button">
              <CurrentBuildIcon name="thread-header-side-panel" />
            </button>
          </div>
        ) : currentHeaderReplay ? (
          <div className="demo-current-mcp-header-actions">
            {isCurrentSubagentReplay ? null : (
              <button aria-label="Open integration menu" type="button">
                ◈⌄
              </button>
            )}
            {isCurrentContextSummaryReplay || isCurrentSubagentReplay ? (
              <ThreadSummaryPopover
                onOpenChange={setThreadSummaryOpen}
                open={threadSummaryOpen}
                sideOffset={isCurrentContextSummaryReplay ? 16 : undefined}
                triggerIcon={
                  <CurrentBuildIcon name="thread-header-summary" />
                }
              >
                {isCurrentSubagentReplay ? (
                  <ThreadSummaryPanel className="demo-subagent-summary-panel">
                    <ThreadSummarySection
                      actions={
                        <ThreadSummaryIconButton
                          icon="+"
                          label="Create a file or site"
                        />
                      }
                      collapsible
                      title="Outputs"
                      toggleLabel="Toggle outputs summary"
                    >
                      <ThreadSummaryItem
                        disabled
                        label="Create a file or site"
                      />
                    </ThreadSummarySection>
                    <ThreadSummarySection
                      collapsible
                      title="Subagents"
                      toggleLabel="Toggle subagents summary"
                    >
                      <ThreadSummaryItem
                        aria-label="Open subagents"
                        label={subagentSummaryLabel}
                        leading={
                          <span className="demo-subagent-summary-avatars">
                            {visibleSummarySubagents.slice(0, 4).map((item) => (
                              <SubagentAvatar
                                active={item.status !== "done"}
                                key={item.id}
                                seed={item.id}
                                size="tiny"
                              />
                            ))}
                          </span>
                        }
                        onClick={() => {
                          setThreadSummaryOpen(false);
                          openSubagentPanel(null);
                        }}
                      />
                    </ThreadSummarySection>
                    <ThreadSummarySection
                      actions={
                        <ThreadSummaryIconButton
                          icon="+"
                          label="Attach files or connect apps"
                        />
                      }
                      collapsible
                      title="Sources"
                      toggleLabel="Toggle sources summary"
                    >
                      <ThreadSummaryItem
                        disabled
                        label="Attach files or connect apps"
                      />
                    </ThreadSummarySection>
                  </ThreadSummaryPanel>
                ) : (
                  <ThreadSummaryPanel className="demo-current-context-summary-panel">
                    <ThreadSummarySection
                      actions={
                        <ThreadSummaryIconButton
                          icon="+"
                          label="Set up local environment"
                        />
                      }
                      collapsible
                      title="Environment"
                      toggleLabel="Toggle environment summary"
                    >
                      <ThreadSummaryItem
                        label="Changes"
                        leading={<SummaryGlyph name="changes" />}
                        meta={<ThreadSummaryDelta added={1} removed={0} />}
                      />
                      <ThreadSummaryItem
                        label="Local"
                        leading={<SummaryGlyph name="computer" />}
                        title="Select where to run the chat"
                        trailing="⌄"
                      />
                      <ThreadSummaryItem
                        label="feat/current-context-continuity"
                        leading={<SummaryGlyph name="branch" />}
                        title="Switch branch"
                        trailing="⌄"
                      />
                      <ThreadSummaryItem
                        label="Commit or push"
                        leading={<SummaryGlyph name="commit" />}
                      />
                      <ThreadSummaryItem
                        label="Create pull request"
                        leading={<SummaryGlyph name="github" />}
                      />
                    </ThreadSummarySection>
                  </ThreadSummaryPanel>
                )}
              </ThreadSummaryPopover>
            ) : isCurrentMcp26818Replay || isCurrentMcp26820Replay ? (
              <button
                aria-label="Toggle pinned summary"
                aria-pressed={mcpSourceSummaryPinned}
                className="codex-ui-thread-summary-toggle"
                onClick={() => {
                  if (mcpSourceSummaryOpen && mcpSourceSummaryPinned) {
                    setMcpSourceSummaryPinned(false);
                    return;
                  }
                  setMcpSourceSummaryOpen(true);
                  setMcpSourceSummaryPinned(true);
                }}
                ref={mcpSourceSummaryTriggerRef}
                type="button"
              >
                <CurrentBuildIcon name="thread-header-summary" />
              </button>
            ) : (
              <button aria-label="Thread settings" type="button">
                ☷
              </button>
            )}
            {!isCurrentSubagentReplay || !subagentPanelOpen ? (
              <>
                <button aria-label="Toggle bottom panel" type="button">
                  ▱
                </button>
                <button
                  aria-label="Toggle side panel"
                  aria-pressed={
                    isCurrentSubagentReplay
                      ? subagentPanelOpen
                      : undefined
                  }
                  onClick={
                    isCurrentSubagentReplay
                      ? toggleSubagentPanel
                      : undefined
                  }
                  type="button"
                >
                  ▯
                </button>
              </>
            ) : null}
          </div>
        ) : (
          <div className="demo-header-actions">
            <span className="demo-status" data-status={displayedStatus}>
              {replayStatusLabel(
                state.status,
                composerIsRunning,
                isConversationLifecycle && replayComposerStopped,
              )}
            </span>
            {scenarioId === "background-terminal" ||
            scenarioId === "terminal-lifecycle" ? (
              <Button
                aria-label="Toggle bottom panel"
                aria-pressed={terminalOpen}
                onClick={toggleTerminalPanel}
                size="small"
                tone="ghost"
              >
                ▱
              </Button>
            ) : null}
            {hasSubagentSurface ? (
              <Button
                aria-label="Toggle side panel"
                aria-pressed={subagentPanelSelected && subagentPanelOpen}
                onClick={toggleSubagentPanel}
                size="small"
                tone="ghost"
              >
                ▯
              </Button>
            ) : null}
            <Button
              onClick={() =>
                selectMode(mode === "replay" ? "live" : "replay")
              }
              size="small"
              tone="ghost"
            >
              {mode === "replay" ? "Live" : "Replay"}
            </Button>
          </div>
        )
      }
      navigation={
        isCurrentMcp26825Replay || isCurrentApproval26825FileReplay ? (
          <div className="demo-current-mcp-26-825-header-navigation">
            <button
              aria-expanded={sidebarOpen}
              aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
              onClick={() => setSidebarOpen((open) => !open)}
              type="button"
            >
              <CurrentBuildIcon name="window-chrome-sidebar" />
            </button>
            <button aria-label="New chat" type="button">
              <CurrentBuildIcon name="sidebar-new-chat" />
            </button>
          </div>
        ) : usesCurrent26825ThreadHeader || isCurrentCitations26825Replay ? (
          <button
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            className="demo-current-basic-26-825-sidebar-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            type="button"
          >
            <CurrentBuildIcon name="window-chrome-sidebar" />
          </button>
        ) : current26820HeaderFrame ? (
          <div className="demo-current-long-thread-header-navigation">
            <button aria-label="Open quick chat" type="button">
              <CurrentBuildIcon name="sidebar-quick-chat" />
            </button>
            <button aria-label="New chat" type="button">
              <CurrentBuildIcon name="sidebar-new-chat" />
            </button>
            {isCurrentApproval26820FileReplay ? null : (
              <span aria-hidden="true">
                <CurrentBuildIcon name="thread-header-project" />
              </span>
            )}
          </div>
        ) : currentHeaderReplay ? (
          isCurrentSubagentReplay ? undefined : (
            <span aria-hidden="true" className="demo-current-mcp-folder">
              ▱
            </span>
          )
        ) : (
          <Button
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            onClick={() => setSidebarOpen(!sidebarOpen)}
            size="small"
            tone="ghost"
          >
            ☰
          </Button>
        )
      }
      subtitle={
        current26820HeaderFrame || currentHeaderReplay
          ? undefined
          : mode === "replay"
          ? `${scenario.id} · ${replayCount}/${scenario.events.length} events`
          : state.threadId ?? "Local app-server"
      }
      startActions={
        usesCurrent26825ThreadHeader ||
        isCurrentMcp26825Replay ||
        isCurrentCitations26825Replay ? (
          <button
            aria-label="Chat actions"
            className="demo-current-basic-26-825-title-actions"
            type="button"
          >
            <CurrentBuildIcon name="thread-header-actions" />
          </button>
        ) : current26820HeaderFrame ? (
          <button
            aria-label="Thread actions"
            className="demo-current-long-thread-title-actions"
            type="button"
          >
            ···
          </button>
        ) : undefined
      }
      title={
        usesCurrent26825ThreadHeader ||
        isCurrentMcp26825Replay ||
        isCurrentCitations26825Replay
          ? (
              <>
                <span
                  aria-hidden="true"
                  className="demo-current-basic-26-825-project-icon"
                >
                  <CurrentBuildIcon name="thread-header-project" />
                </span>
                <button
                  className="demo-current-basic-26-825-header-title"
                  type="button"
                >
                  <span>
                    {isCurrentMcp26825Replay ||
                    isCurrentCitations26825Replay ||
                    isCurrentApproval26825FileReplay
                      ? scenario.label
                      : "Reply with CURRENT BASIC MESSAGE"}
                  </span>
                </button>
              </>
            )
          : current26820HeaderFrame
          ? current26825LongFrame
            ? "LONG THREAD 01"
            : isCurrentCommandReplay
              ? scenario.label
              : isCurrentApproval26820FileReplay
                ? scenario.label
                : "查找 MCP 官方文档"
          : mode === "replay"
            ? scenario.label
            : "Live local thread"
      }
    />
  );

  const showMeasuredComposer =
    mode === "replay" &&
    (scenarioId === "multi-file-review" ||
      scenarioId === "current-review-rename" ||
      scenarioId === "current-review-files" ||
      scenarioId === "current-review-26-825-files" ||
      scenarioId === "mixed-file-review" ||
      scenarioId === "markdown" ||
      isCurrentMarkdown26818Replay ||
      isCurrentMarkdown26825Replay ||
      isCurrentMarkdown26825MediaReplay ||
      isCurrentMcpReplay ||
      scenarioId === "mcp-tool-call" ||
      scenarioId === "mcp-recovery-mixed-thread" ||
      scenarioId === "attachment-lifecycle" ||
      scenarioId === "approval-current-26-820-file" ||
      scenarioId === "approval-current-26-825-file" ||
      scenarioId === "approval-allow-once" ||
      scenarioId === "approval-denied" ||
      scenarioId === "approval-similar-commands" ||
      scenarioId === "approval-for-session" ||
      scenarioId === "approval-review-timeout" ||
      scenarioId === "long-command-output" ||
      scenarioId === "command-failure-recovery" ||
      scenarioId === "interruption" ||
      isCurrentCommandReplay ||
      scenarioId === "compaction" ||
      scenarioId === "context-summary" ||
      isAnyCurrentBasicMessageReplay ||
      isCurrentBrowser26825Replay ||
      isCurrentBrowserFailure26825Replay ||
      isCurrentCitations26825Replay ||
      isCurrentPlan26825Replay ||
      isCurrentReasoning26825Replay ||
      isCurrentSearch26825Replay ||
      isCurrentTransportRecoveryReplay ||
      isCurrentSubagentReplay);
  const showLifecycleComposer = isConversationLifecycle;
  const currentComposerComposition =
    currentHeaderReplay || showLifecycleComposer || isCurrentApprovalReplay;
  const currentProductAttachmentFrame =
    activeFrame === "attachment-current-post-picker" ||
    activeFrame === "attachment-current-preview";
  const removeComposerAttachment = (id: string) => {
    if (attachmentPreviewId === id) setAttachmentPreviewId(null);
    setComposerAttachments((items) => {
      const next = items.filter((item) => item.id !== id);
      if (next.length === 0) {
        setActiveFrame(isCurrentAttachmentReplay ? "attachment-empty" : null);
      }
      return next;
    });
    requestAnimationFrame(() => composerInputRef.current?.focus());
  };
  const retryComposerAttachment = (id: string) => {
    cancelReplaySubmitTimer();
    if (id.startsWith("native-selection-error:")) {
      void selectFilesAndFolders(id);
      return;
    }
    const previewRetry = composerAttachments.some(
      (item) => item.id === id && item.status === "preview-error",
    );
    if (previewRetry) {
      setComposerAttachments((items) =>
        items.map((item) =>
          item.id === id
            ? {
                ...item,
                previewSrc: attachmentPreviewDataUrl,
                status: "ready",
              }
            : item,
        ),
      );
      setActiveFrame("attachment-ready");
      requestAnimationFrame(() => composerInputRef.current?.focus());
      return;
    }
    setComposerAttachments((items) =>
      items.map((item) =>
        item.id === id
          ? { ...item, progress: 18, status: "uploading" }
          : item,
      ),
    );
    setActiveFrame("attachment-uploading");
    requestAnimationFrame(() => composerInputRef.current?.focus());
    replaySubmitTimerRef.current = window.setTimeout(() => {
      replaySubmitTimerRef.current = null;
      setComposerAttachments((items) =>
        items.map((item) =>
          item.id === id
            ? { ...item, progress: undefined, status: "ready" }
            : item,
        ),
      );
      setActiveFrame("attachment-multi-ready");
    }, 420);
  };
  async function selectFilesAndFolders(replacingErrorId?: string) {
    const previousAttachmentFrame = activeFrame;
    setComposerOverlay(null);
    setActiveFrame("attachment-picker");
    if (
      !window.codexDemo ||
      window.codexDemo.useRendererAttachmentFixture
    ) {
      const selectionVersion = attachmentSelectionCounterRef.current++;
      setComposerAttachments((items) => [
        ...items.filter((item) => item.id !== replacingErrorId),
        ...attachmentItemsForFrame("attachment-ready").map(
          (attachment, index) => ({
            ...attachment,
            id: `${attachment.id}:selection:${selectionVersion}:${index + 1}`,
          }),
        ),
      ]);
      setActiveFrame("attachment-ready");
      setComposerValue(
        (current) => current || initialComposerValue("attachment-ready"),
      );
      requestAnimationFrame(() => composerInputRef.current?.focus());
      return;
    }
    try {
      const selected = await window.codexDemo.selectAttachments();
      if (selected.length === 0) {
        setActiveFrame(previousAttachmentFrame);
        requestAnimationFrame(() => composerInputRef.current?.focus());
        return;
      }
      const selectionVersion = attachmentSelectionCounterRef.current++;
      setComposerAttachments((items) => [
        ...items.filter((item) => item.id !== replacingErrorId),
        ...selected.map((item, index) => ({
          ...item,
          id: `${item.id}:selection:${selectionVersion}:${index + 1}`,
          layout: "card" as const,
          status: "ready" as const,
        })),
      ]);
      setActiveFrame("attachment-native-ready");
      setComposerValue(
        (current) =>
          current || initialComposerValue("attachment-native-ready"),
      );
    } catch {
      const selectionVersion = attachmentSelectionCounterRef.current++;
      setComposerAttachments((items) =>
        replacingErrorId
          ? items
          : [
              ...items,
              {
                id: `native-selection-error:selection:${selectionVersion}`,
                kind: "file",
                label: "Files and folders",
                layout: "card",
                status: "error",
              },
            ],
      );
      setActiveFrame("attachment-upload-error");
    }
    requestAnimationFrame(() => composerInputRef.current?.focus());
  }
  const composerAttachmentNodes = composerAttachments.map((attachment) => (
    <ComposerAttachment
      icon={
        currentProductAttachmentFrame ? undefined : attachment.kind === "folder" ? (
          <CurrentBuildIcon name="composer-project" />
        ) : attachment.kind === "file" ? (
          <span className="demo-current-file-type">
            {attachment.meta?.split(/\s|·/)[0] ?? "FILE"}
          </span>
        ) : undefined
      }
      key={attachment.id}
      kind={attachment.kind}
      label={attachment.label}
      layout={attachment.layout}
      meta={attachment.meta}
      openLabel={
        currentProductAttachmentFrame ? attachment.label : undefined
      }
      onOpen={
        attachment.kind === "image"
          ? () => setAttachmentPreviewId(attachment.id)
          : currentProductAttachmentFrame
            ? undefined
            : () => undefined
      }
      onRemove={() => removeComposerAttachment(attachment.id)}
      onRetry={
        attachment.status === "error" ||
        attachment.status === "preview-error"
          ? () => retryComposerAttachment(attachment.id)
          : undefined
      }
      previewSrc={attachment.previewSrc}
      progress={attachment.progress}
      status={attachment.status}
    />
  ));
  const composerSurface = (
    <AgentComposer
      actions={
        currentProductAttachmentFrame ? (
          <span className="demo-composer-controls">
            <button aria-label="Add files and more" type="button">
              <CurrentBuildIcon name="composer-add-files" />
            </button>
          </span>
        ) : showMeasuredComposer || showLifecycleComposer ? (
          <span className="demo-composer-controls">
            <button
              aria-expanded={composerOverlay === "resources"}
              aria-label="Add files and more"
              onClick={() => {
                if (!isCurrentAttachmentReplay) setActiveFrame(null);
                setComposerOverlay((current) =>
                  current === "resources" ? null : "resources",
                );
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Escape" &&
                  composerOverlay === "resources"
                ) {
                  event.preventDefault();
                  dismissComposerResources();
                }
              }}
              ref={composerResourceTriggerRef}
              type="button"
            >
              {currentComposerComposition ? (
                <CurrentBuildIcon name="composer-add-files" />
              ) : (
                "+"
              )}
            </button>
            <ComposerPermissionMenu
              align="start"
              heading="How should ChatGPT actions be approved?"
              learnMore="Learn more"
              onOpenChange={(open) => {
                setActiveFrame(null);
                setComposerOverlay((current) =>
                  open
                    ? "permissions"
                    : current === "permissions"
                      ? null
                      : current,
                );
              }}
              onSelect={(option) => {
                setComposerPermissionId(option.id);
                setComposerOverlay(null);
                setActiveFrame(null);
              }}
              open={composerOverlay === "permissions"}
              options={composerPermissionOptions}
              selectedId={selectedComposerPermission.id}
              side="top"
              sideOffset={1.5}
              trigger={
                <button
                  aria-label="Change permissions"
                  className="demo-composer-permission-trigger"
                  type="button"
                >
                  <span aria-hidden="true">
                    {currentComposerComposition ? (
                      selectedComposerPermission.id === "ask" ? (
                        <CurrentBuildIcon name="composer-permission-ask" />
                      ) : (
                        <CurrentBuildIcon name="composer-permission" />
                      )
                    ) : (
                      "◉"
                    )}
                  </span>
                  {currentHeaderReplay ||
                  showLifecycleComposer ||
                  isCurrentApprovalReplay
                    ? isCurrentBrowser26825Replay
                      ? null
                      : selectedComposerPermission.label
                    : "Approve for me"}
                </button>
              }
            />
            {composerMode ? (
              <ComposerModeIndicator
                clearLabel={
                  composerMode === "goal" ? "Clear goal" : "Plan"
                }
                kind={composerMode}
                label={composerMode === "goal" ? "Goal" : "Plan"}
                onClear={() => {
                  setComposerMode(null);
                  setActiveFrame(null);
                  requestAnimationFrame(() => composerInputRef.current?.focus());
                }}
              />
            ) : null}
          </span>
        ) : undefined
      }
      allowAttachmentOnlySubmit={
        isCurrentAttachmentReplay && attachmentSubmissionReady
      }
      allowSubmitWhileRunning={showLifecycleComposer}
      aria-busy={composerIsDisabled || undefined}
      attachments={composerAttachmentNodes}
      controls={
        currentProductAttachmentFrame ? (
          <span className="demo-composer-actions">
            <span className="demo-current-composer-model">
              <span>Instant</span>
              <CurrentBuildIcon name="composer-model-chevron" />
            </span>
            <button aria-label="Dictate" type="button">
              <CurrentBuildIcon name="composer-dictate" />
            </button>
          </span>
        ) : showMeasuredComposer || showLifecycleComposer ? (
          <span className="demo-composer-actions">
            {isAnyCurrentBasicMessageReplay || isCurrentCitations26825Replay ? (
              <button
                className="demo-current-composer-model"
                type="button"
              >
                <span>5.6 Sol Extra High</span>
                <CurrentBuildIcon name="composer-model-chevron" />
              </button>
            ) : (
              <span className="demo-current-composer-model">
                <span>5.6 Sol Extra High</span>
                {currentComposerComposition ? (
                  <CurrentBuildIcon name="composer-model-chevron" />
                ) : (
                  <span aria-hidden="true">⌄</span>
                )}
              </span>
            )}
            <button aria-label="Dictate" type="button">
              {currentComposerComposition ? (
                <CurrentBuildIcon name="composer-dictate" />
              ) : (
                "♫"
              )}
            </button>
          </span>
        ) : undefined
      }
      disabled={composerIsDisabled}
      isRunning={composerIsRunning}
      layout={
        showMeasuredComposer || showLifecycleComposer
          ? "multiline"
          : "auto"
      }
      onStop={stopComposer}
      onSubmit={submitComposer}
      onValueChange={setComposerValue}
      placeholder={
        composerMode === "goal"
          ? "Describe your goal, define measurable outcomes for best results"
          : composerMode === "plan"
            ? "Describe your task to generate a plan..."
            : currentProductAttachmentFrame
              ? "Message ChatGPT"
            : showMeasuredComposer || showLifecycleComposer
              ? "Do anything"
              : mode === "live"
                ? "Ask Codex to inspect this repository…"
                : "Switch to Live to send a real local turn…"
      }
      stopLabel="Stop"
      submitDisabled={
        isCurrentAttachmentReplay
          ? !attachmentSubmissionReady
          : composerAttachments.length > 0 && !attachmentSubmissionReady
      }
      submitLabel={
        isCurrentCommandInterruptionReplay ||
        isCurrentContextCompactionReplay ||
        isCurrentTransportRecoveryReplay ||
        isAnyCurrentBasicMessageReplay ||
        isCurrentCitations26825Replay ||
        currentProductAttachmentFrame
          ? "Send"
          : undefined
      }
      suggestions={
        isCurrentContextCompactionReplay &&
        (activeFrame === "context-compaction-ready" ||
          activeFrame === "context-compaction-command-menu") &&
        composerValue.trim() === "/compact" ? (
          <div
            aria-label="Slash commands"
            className="demo-compaction-command-menu"
            role="listbox"
          >
            <button
              aria-label="Compact this chat's context (10% full)"
              className="demo-compaction-command"
              onClick={startReplayCompaction}
              role="option"
              type="button"
            >
              <span aria-hidden="true" className="demo-compaction-command__icon">
                ◴
              </span>
              <span className="demo-compaction-command__label">Compact</span>
              <span className="demo-compaction-command__description">
                Compact this chat&apos;s context (10% full)
              </span>
            </button>
          </div>
        ) : (showMeasuredComposer || showLifecycleComposer) &&
          composerOverlay === "resources" ? (
          <ComposerResourcePicker
            activeId={composerResourceActiveId}
            groups={composerResourceGroups}
            onActiveIdChange={setComposerResourceActiveId}
            onDismiss={dismissComposerResources}
            onSelect={(option) => {
              setComposerResourceActiveId(option.id);
              if (isCurrentAttachmentReplay && option.id === "files") {
                void selectFilesAndFolders();
                return;
              }
              if (
                isCurrentAttachmentReplay &&
                (option.id === "goal" || option.id === "plan")
              ) {
                selectScenario(
                  "conversation-lifecycle",
                  `composer-${option.id}`,
                );
                return;
              }
              if (option.id === "goal" || option.id === "plan") {
                setComposerMode(option.id);
                setComposerValue("");
              }
              dismissComposerResources();
            }}
          />
        ) : undefined
      }
      textareaLabel={
        composerMode === "goal"
          ? "Describe your goal, define measurable outcomes for best results"
          : composerMode === "plan"
            ? "Describe your task to generate a plan..."
            : currentProductAttachmentFrame
              ? "Message ChatGPT"
              : "Message composer"
      }
      ref={composerInputRef}
      value={composerValue}
    />
  );
  const attachmentPreviewImage = attachmentPreviewId
    ? composerAttachments.find(({ id }) => id === attachmentPreviewId)
    : undefined;
  const regularComposer = showLifecycleComposer ? (
    <ComposerDock
      composer={composerSurface}
      context={
        !current26825LongFrame &&
        !composerIsRunning &&
        !queueInterrupted ? (
          <ComposerContextBar>
            <ComposerContextControl
              icon={<CurrentBuildIcon name="composer-project" />}
            >
              codex-ui-kit
            </ComposerContextControl>
            <ComposerContextControl
              icon={<CurrentBuildIcon name="composer-worktree" />}
            >
              Local
            </ComposerContextControl>
            <ComposerContextControl
              icon={<CurrentBuildIcon name="composer-branch" />}
            >
              main
            </ComposerContextControl>
          </ComposerContextBar>
        ) : undefined
      }
      queue={
        queuedPrompts.length > 0 ? (
          <QueuedPromptList
            interrupted={queueInterrupted}
            items={queuedPrompts}
            onDelete={deleteQueuedPrompt}
            onEdit={editQueuedPrompt}
            onQueueingChange={setQueueingEnabled}
            onReorder={reorderQueuedPrompts}
            onResume={resumeQueue}
            onSendNow={sendQueuedPromptNow}
            queueingEnabled={queueingEnabled}
          />
        ) : undefined
      }
    />
  ) : (
    composerSurface
  );
  const composerPlanProgress =
    state.status === "running" &&
    state.planTurnId === state.currentTurnId &&
    state.plan.length > 0 ? (
      <ComposerPlanProgress
        defaultOpen={
          activeFrame === "conversation-plan-current-26-825-open"
        }
        key={activeFrame}
        steps={state.plan}
      />
    ) : null;
  const currentPendingApproval = isCurrentApprovalReplay
    ? state.approvals.find(({ decision }) => decision === "pending")
    : undefined;
  const currentPendingApprovalFilePath =
    currentPendingApproval?.command ??
    (isCurrentApproval26825FileReplay
      ? "/Users/demo-user/Desktop/codex-ui-kit-26-825-approval-probe-pending.txt"
      : "/Users/demo/Desktop/codex-ui-kit-26-820-approval-file.txt");
  const currentPendingApprovalFileName =
    currentPendingApprovalFilePath.split("/").filter(Boolean).at(-1) ??
    "approval-file.txt";
  const currentPendingApprovalDirectory = currentPendingApprovalFilePath.slice(
    0,
    Math.max(0, currentPendingApprovalFilePath.lastIndexOf("/") + 1),
  );
  const composer = currentPendingApproval ? (
    <ApprovalRequest
      approvalOptionsIcon={
        <CurrentBuildIcon name="composer-model-chevron" />
      }
      autoFocus={false}
      className={
        isCurrentApproval26825FileReplay
          ? "demo-current-26-825-file-approval"
          : isCurrentApproval26820FileReplay
            ? "demo-current-26-820-file-approval"
            : undefined
      }
      children={
        isCurrentApproval26825FileReplay ? (
          <ApprovalFilePreview
            additions={1}
            deletions={0}
            directory={currentPendingApprovalDirectory}
            fileName={currentPendingApprovalFileName}
          />
        ) : undefined
      }
      data-item-id={currentPendingApproval.itemId}
      data-testid="current-approval-request"
      description={
        isCurrentApproval26825FileReplay
          ? undefined
          : isCurrentApproval26820FileReplay
          ? currentPendingApproval.reason
          : currentPendingApproval.command
      }
      identity={
        isCurrentApproval26825FileReplay
          ? "Edit files"
          : isCurrentApproval26820FileReplay
          ? "Permissions"
          : currentPendingApproval.kind === "file"
            ? "Edit files"
            : "Terminal"
      }
      identityIcon={
        isCurrentApproval26825FileReplay ? (
          <CurrentBuildIcon name="sidebar-project-menu-edit" />
        ) : isCurrentApproval26820FileReplay ? (
          <CurrentBuildIcon name="composer-permission-ask" />
        ) : currentPendingApproval.kind === "file" ? undefined : (
            <CurrentBuildIcon name="thread-command-terminal" />
          )
      }
      kind={
        isCurrentApproval26825FileReplay
          ? "file"
          : isCurrentApproval26820FileReplay
          ? "permission"
          : currentPendingApproval.kind
      }
      onApprove={() =>
        respondToApproval(currentPendingApproval.requestId, "accept")
      }
      onReject={() =>
        respondToApproval(currentPendingApproval.requestId, "decline")
      }
      presentation="composer"
      scopedApproveAction={{
        info: isCurrentApproval26820FileReplay
          ? undefined
          : currentPendingApproval.kind === "file"
            ? "Allow this and future file edits in this conversation without asking again"
            : "Allow future commands that match this proposed rule",
        label:
          isCurrentApproval26825FileReplay
            ? "Allow all edits"
            : isCurrentApproval26820FileReplay
            ? "Allow this conversation"
            : currentPendingApproval.kind === "file"
            ? "Allow all edits"
            : "Allow similar commands",
        onClick: () =>
          respondToApproval(
            currentPendingApproval.requestId,
            currentPendingApproval.kind === "file"
              ? "acceptForSession"
              : "accept",
            currentPendingApproval.kind === "file" ? "once" : "similar",
          ),
      }}
      title={
        isCurrentApproval26825FileReplay ? (
          "Allow ChatGPT to edit the following file?"
        ) : isCurrentApproval26820FileReplay ? (
          <span className="demo-current-26-820-file-approval__question">
            Allow ChatGPT to edit the contents of{" "}
            <span className="demo-current-26-820-file-approval__file">
              <CurrentBuildIcon name="review-file-text" />
              <span>{currentPendingApprovalFileName}</span>
            </span>
            ?
          </span>
        ) : currentPendingApproval.kind === "file"
          ? "Allow ChatGPT to edit the following file?"
          : scenarioId === "approval-denied"
            ? "是否允许创建这个指定的 Desktop 哨兵文件?"
            : "Allow opening the requested local application?"
      }
    />
  ) : (
    regularComposer
  );

  const createdWorkspaceProject = createdProjects.find(
    ({ id }) => id === workspaceProjectId,
  );
  const workspaceProjectFixture =
    workspaceProjectId === null
      ? undefined
      : createdWorkspaceProject
        ? {
            ...createdWorkspaceProject,
            icon: <SidebarGlyph name="folder" />,
            status: "available" as const,
          }
        : (workspaceProjects.find(
            ({ id }) => id === workspaceProjectId,
          ) ?? workspaceProjects[0]);
  const workspaceProject =
    workspaceProjectFixture &&
    workspaceUsesHostBranches &&
    window.codexDemo &&
    workspaceProjectId === window.codexDemo.workspaceProjectId
      ? {
          ...workspaceProjectFixture,
          path: window.codexDemo.workspaceProjectPath,
        }
      : workspaceProjectFixture;
  const createdProjectBranches = workspaceProjectId
    ? (workspaceCreatedBranches[workspaceProjectId] ?? [])
    : [];
  const createdProjectBranchNames = new Set(
    createdProjectBranches.map(({ branch }) => branch),
  );
  const workspaceHostBranchState = workspaceProjectId
    ? workspaceHostBranchesByProject[workspaceProjectId]
    : undefined;
  const workspaceBranchesCheckedOutElsewhere = new Set(
    workspaceHostBranchState?.status === "ready"
      ? workspaceHostBranchState.branchesCheckedOutElsewhere
      : [],
  );
  const workspaceBranchesUnavailableForCheckout = new Set(
    workspaceHostBranchState?.status === "ready"
      ? workspaceHostBranchState.branchesUnavailableForCheckout
      : [],
  );
  const workspaceLocalEnvironmentGroups = (() => {
    if (!workspaceUsesHostBranches || !workspaceProjectId) {
      return workspaceEnvironmentGroups;
    }
    const templateGroup = workspaceEnvironmentGroups.find(
      ({ id }) => id === workspaceProjectId,
    ) ?? workspaceEnvironmentGroups[0];
    if (!templateGroup) return [];
    const [currentCheckout] = templateGroup.items;
    if (!currentCheckout) return [];
    const hostGroup = {
      ...templateGroup,
      id: workspaceProjectId,
      label: workspaceProject?.label ?? workspaceProjectId,
    };
    if (workspaceHostBranchState?.status !== "ready") {
      return [
        {
          ...hostGroup,
          items: [
            {
              ...currentCheckout,
              disabled: true,
              meta: "Loading Git branches",
              status: "unavailable" as const,
            },
          ],
        },
      ];
    }
    const currentBranch = workspaceHostBranchState.currentBranch;
    const currentItem = currentBranch
      ? {
          ...currentCheckout,
          branch: currentBranch,
          id: workspaceGitBranchId(currentBranch),
          label: currentBranch === "main" ? "Main" : "Current checkout",
          meta: "current",
          textValue:
            currentBranch === "main" ? "Main" : "Current checkout",
        }
      : {
          ...currentCheckout,
          branch:
            workspaceHostBranchState.unbornBranch ?? "Detached HEAD",
          id: unattachedWorkspaceBranchId,
          label: workspaceHostBranchState.unbornBranch
            ? "Unborn checkout"
            : "Detached HEAD",
          meta: "current",
          textValue: workspaceHostBranchState.unbornBranch
            ? "Unborn checkout"
            : "Detached HEAD",
        };
    return [{ ...hostGroup, items: [currentItem] }];
  })();
  const workspaceBranchOperationsAvailable =
    !workspaceUsesHostBranches ||
    Boolean(
      workspaceProjectToken && workspaceHostBranchState?.status === "ready",
    );
  const workspaceBranchControlAvailable =
    !workspaceUsesHostBranches ||
    Boolean(
      workspaceProjectToken && workspaceHostBranchState?.status !== "error",
    );
  const workspaceWorktrees = workspaceProjectId
    ? workspaceUsesHostBranches
      ? workspaceHostBranchState?.status === "ready"
        ? [
            ...(workspaceHostBranchState.currentBranch
              ? []
              : [
                  unattachedWorkspaceBranch(
                    workspaceHostBranchState.unbornBranch,
                  ),
                ]),
            ...workspaceHostBranchState.branches.map((branch) =>
              workspaceGitBranch(
                branch,
                workspaceBranchesCheckedOutElsewhere,
                workspaceBranchesUnavailableForCheckout,
              ),
            ),
          ]
        : [workspaceBranches[0]]
      : [
          ...(workspaceWorktreesByProject[workspaceProjectId] ?? [
            workspaceBranches[0],
          ]).filter(
            ({ branch }) => !createdProjectBranchNames.has(branch),
          ),
          ...createdProjectBranches,
        ]
    : [workspaceBranches[0]];
  const selectedLinkedWorkspaceWorktree = workspaceEnvironmentGroups
    .find(({ id }) => id === workspaceProjectId)
    ?.items.find(({ id }) => id === workspaceWorktreeId);
  const workspaceWorktree =
    workspaceWorktrees.find(({ id }) => id === workspaceWorktreeId) ??
    selectedLinkedWorkspaceWorktree ??
    workspaceWorktrees[0];
  const currentWorkspaceCwd = workspaceExecutionCwd({
    environmentId: workspaceEnvironmentId,
    inPlaceBranch:
      workspaceUsesHostBranches &&
      hostSelectionUsesInPlaceBranch(workspaceWorktreeId),
    projectPath: workspaceProject?.path,
    worktreeBranch: workspaceWorktree.branch,
    worktreeId: workspaceWorktreeId,
  });
  const selectableWorkspaceProjects = [
    ...createdProjects.map((project) => ({
      ...project,
      icon: <SidebarGlyph name="folder" />,
      status: "available" as const,
    })),
    ...workspaceProjects,
  ];
  const filteredWorkspaceProjects = selectableWorkspaceProjects.filter(
    ({ label }) =>
      label
        .toLocaleLowerCase()
        .includes(workspaceProjectQuery.trim().toLocaleLowerCase()),
  );
  const workspaceProjectPinnedItems = [
    {
      ariaLabel: "New project",
      disabled: projectCreationStatus === "selecting",
      icon: <CurrentBuildIcon name="composer-new-project" />,
      id: workspaceNewProjectOptionId,
      label:
        projectCreationStatus === "selecting"
          ? "Choosing project…"
          : "New project",
    },
    {
      ariaLabel: "Don't work in a project",
      icon: <CurrentBuildIcon name="composer-clear-project" />,
      id: workspaceNoProjectOptionId,
      label: "Don't work in a project",
    },
  ];
  const filteredWorkspaceWorktrees =
    workspaceWorktrees.filter(
      ({ branch, id, label, status }) =>
        id !== unattachedWorkspaceBranchId &&
        status !== "repairing" &&
        `${branch} ${label}`
          .toLocaleLowerCase()
          .includes(workspaceBranchQuery.trim().toLocaleLowerCase()),
    );
  const workspaceBaseFrame =
    workspacePage === "environments"
      ? "workspace-environments-unavailable"
      : workspacePage === "general-settings"
        ? activeFrame?.startsWith("workspace-general-settings")
          ? activeFrame
          : "workspace-general-settings"
      : workspacePage === "personalization-settings"
        ? activeFrame?.startsWith("workspace-personalization-settings")
          ? activeFrame
          : "workspace-personalization-settings"
      : workspacePage === "keyboard-shortcuts-settings"
        ? activeFrame?.startsWith("workspace-keyboard-shortcuts")
          ? activeFrame
          : "workspace-keyboard-shortcuts"
      : workspacePage === "usage-settings"
        ? activeFrame?.startsWith("workspace-usage-settings")
          ? activeFrame
          : "workspace-usage-settings"
      : workspacePage === "plan-settings"
        ? activeFrame?.startsWith("workspace-plan-settings")
          ? activeFrame
          : "workspace-plan-settings-personal"
      : workspacePage === "voice-settings"
        ? activeFrame?.startsWith("workspace-voice-settings")
          ? activeFrame
          : "workspace-voice-settings"
      : workspacePage === "hooks-settings"
        ? activeFrame?.startsWith("workspace-hooks-settings")
          ? activeFrame
          : "workspace-hooks-settings"
      : workspacePage === "worktree-settings"
        ? activeFrame?.startsWith("workspace-worktree-settings")
          ? activeFrame
          : "workspace-worktree-settings"
      : workspacePage === "code-review-settings"
        ? activeFrame?.startsWith("workspace-code-review-settings")
          ? activeFrame
          : "workspace-code-review-settings"
      : workspacePage === "appearance-settings"
        ? initialSelection.frame?.startsWith("workspace-appearance-settings")
          ? initialSelection.frame
          : "workspace-appearance-settings"
      : workspacePage === "git-settings"
        ? initialSelection.frame === "workspace-git-settings-compact"
          ? "workspace-git-settings-compact"
          : "workspace-git-settings"
      : projectIndexChat
      ? "projects-index-chat"
      : activeFrame === "workspace-branch-created"
        ? activeFrame
      : activeFrame?.startsWith("current-home-")
        ? activeFrame
      : currentWorkspacePersistenceFrame(activeFrame)
      ? activeFrame
      : currentComposerControls26825Replay
        ? currentComposerQueue26825Replay
          ? `workspace-composer-current-26-825-queue-${currentQueue26825Phase ?? "pending"}`
          : currentComposerMultiline26825Replay
            ? initialSelection.frame ??
              "workspace-composer-current-26-825-multiline-four"
          : composerOverlay === "resources"
            ? "workspace-composer-current-26-825-resources"
          : composerOverlay === "permissions"
          ? "workspace-composer-current-26-825-permissions"
          : composerMode === "goal"
            ? "workspace-composer-current-26-825-goal"
            : composerMode === "plan"
              ? "workspace-composer-current-26-825-plan"
              : "workspace-composer-current-26-825-ready"
      : currentContext26825Replay
        ? workspaceProjectId === null
          ? "workspace-context-current-26-825-no-project"
          : workspaceEnvironmentId === "worktree"
            ? "workspace-context-current-26-825-new-worktree"
            : "workspace-context-current-26-825-ready"
      : initialSelection.frame === "workspace-compact-ready"
      ? "workspace-compact-ready"
      : workspaceProjectId === null
        ? "workspace-no-project"
        : workspaceEnvironmentId === "worktree"
          ? "workspace-new-worktree"
            : workspaceWorktree.status === "repairing"
              ? "workspace-repairing"
              : createdWorkspaceProject
                ? "workspace-project-created"
                : "workspace-ready";
  useEffect(() => {
    if (view === "workspace" && workspaceLocalEnvironmentOpen) {
      setActiveFrame("workspace-environment");
    }
  }, [view, workspaceLocalEnvironmentOpen]);
  useEffect(() => {
    if (
      view !== "workspace" ||
      workspaceLocalEnvironmentOpen ||
      workspaceBranchDialogOpen ||
      workspaceOverlay
    ) {
      return;
    }
    setActiveFrame(workspaceBaseFrame);
  }, [
    view,
    workspaceBaseFrame,
    workspaceBranchDialogOpen,
    workspaceLocalEnvironmentOpen,
    workspaceOverlay,
  ]);
  useEffect(() => {
    if (
      ![
        "appearance-settings",
        "code-review-settings",
        "general-settings",
        "git-settings",
        "hooks-settings",
        "keyboard-shortcuts-settings",
        "personalization-settings",
        "usage-settings",
        "voice-settings",
        "worktree-settings",
      ].includes(
        workspacePage,
      ) ||
      !settingsRouteFocusPending
    ) return;
    const timer = window.setTimeout(() => {
      settingsBackButtonRef.current?.focus();
      setSettingsRouteFocusPending(false);
    });
    return () => window.clearTimeout(timer);
  }, [settingsRouteFocusPending, workspacePage]);
  useEffect(() => {
    if (
      workspacePage !== "personalization-settings" ||
      !activeFrame?.startsWith("workspace-personalization-settings")
    ) {
      return;
    }
    const scrollOwner = document.querySelector<HTMLElement>(
      ".codex-ui-settings-shell__main",
    );
    if (!scrollOwner) return;
    scrollOwner.scrollTop = activeFrame.endsWith("-bottom")
      ? scrollOwner.scrollHeight
      : 0;
  }, [activeFrame, workspacePage]);
  useEffect(() => {
    if (
      workspacePage !== "keyboard-shortcuts-settings" ||
      !activeFrame?.startsWith("workspace-keyboard-shortcuts")
    ) {
      return;
    }
    const scrollOwner = document.querySelector<HTMLElement>(
      ".codex-ui-settings-shell__main",
    );
    if (!scrollOwner) return;
    scrollOwner.scrollTop = activeFrame.endsWith("-bottom")
      ? scrollOwner.scrollHeight
      : 0;
  }, [activeFrame, workspacePage]);
  useEffect(() => {
    if (
      workspacePage !== "usage-settings" ||
      !activeFrame?.startsWith("workspace-usage-settings")
    ) {
      return;
    }
    const scrollOwner = document.querySelector<HTMLElement>(
      ".codex-ui-settings-shell__main",
    );
    if (!scrollOwner) return;
    scrollOwner.scrollTop = activeFrame.endsWith("-bottom")
      ? scrollOwner.scrollHeight
      : 0;
  }, [activeFrame, workspacePage]);
  useEffect(() => {
    if (
      workspacePage !== "voice-settings" ||
      !activeFrame?.startsWith("workspace-voice-settings")
    ) {
      return;
    }
    const scrollOwner = document.querySelector<HTMLElement>(
      ".codex-ui-settings-shell__main",
    );
    if (!scrollOwner) return;
    scrollOwner.scrollTop = activeFrame.endsWith("-bottom")
      ? scrollOwner.scrollHeight
      : 0;
  }, [activeFrame, workspacePage]);
  useEffect(() => {
    if (
      workspacePage !== "appearance-settings" ||
      !activeFrame?.startsWith("workspace-appearance-settings")
    ) {
      return;
    }
    const scrollOwner = document.querySelector<HTMLElement>(
      ".codex-ui-settings-shell__main",
    );
    if (!scrollOwner) return;
    scrollOwner.scrollTop = activeFrame?.endsWith("-preferences")
      ? scrollOwner.scrollHeight
      : 0;
  }, [activeFrame, workspacePage]);
  useEffect(() => {
    if (
      workspacePage !== "general-settings" ||
      !activeFrame?.startsWith("workspace-general-settings")
    ) {
      return;
    }
    const scrollOwner = document.querySelector<HTMLElement>(
      ".codex-ui-settings-shell__main",
    );
    if (!scrollOwner) return;
    scrollOwner.scrollTop =
      activeFrame.endsWith("-bottom") || activeFrame.endsWith("-hotkey")
      ? scrollOwner.scrollHeight
      : 0;
  }, [activeFrame, workspacePage]);
  const setWorkspaceOverlayState = (
    overlay:
      | "environment"
      | "project"
      | "worktree"
      | "worktree-environment"
      | null,
  ) => {
    const currentFrame = (suffix: string) =>
      currentContext26825Replay
        ? `workspace-context-current-26-825-${suffix}`
        : `workspace-${suffix}`;
    if (overlay) setWorkspaceLocalEnvironmentOpen(false);
    if (overlay !== "project") setWorkspaceProjectQuery("");
    setWorkspaceOverlay(overlay);
    setActiveFrame(
      overlay === "project"
        ? currentFrame("project-menu")
        : overlay === "environment"
          ? currentFrame("environment-menu")
          : overlay === "worktree"
            ? currentFrame("worktree-menu")
            : overlay === "worktree-environment"
              ? currentFrame("environment-picker")
              : workspaceBaseFrame,
    );
  };
  const openWorkspaceLocalEnvironment = (
    launcher: "environment" | "worktree",
  ) => {
    setWorkspaceEnvironmentLauncher(launcher);
    setWorkspaceOverlay(null);
    setWorkspaceEnvironmentQuery("");
    setWorkspaceLocalEnvironmentOpen(true);
  };
  const closeWorkspaceLocalEnvironment = () => {
    setWorkspaceEnvironmentQuery("");
    setWorkspaceLocalEnvironmentOpen(false);
    setActiveFrame("workspace-ready");
  };
  const openWorkspaceBranchCreation = () => {
    if (!workspaceBranchOperationsAvailable) return;
    setWorkspaceOverlay(null);
    setWorkspaceBranchName("");
    setWorkspaceBranchError(undefined);
    setWorkspaceBranchStatus("idle");
    setWorkspaceBranchDialogOpen(true);
    setActiveFrame("workspace-branch-create");
  };
  const closeWorkspaceBranchCreation = () => {
    if (workspaceBranchStatus === "creating") return;
    setWorkspaceBranchDialogOpen(false);
    setWorkspaceBranchStatus("idle");
    setWorkspaceBranchError(undefined);
    setActiveFrame("workspace-ready");
  };
  const createWorkspaceBranch = async (rawBranchName: string) => {
    const branchName = trimBranchInputAsciiWhitespace(rawBranchName);
    const projectId = workspaceProjectId;
    if (!branchName || !projectId) return;
    const projectToken = workspaceProjectTokens[projectId];
    if (workspaceUsesHostBranches && !projectToken) {
      setWorkspaceBranchStatus("error");
      setWorkspaceBranchError(
        "Add this project from a local directory before managing its Git branches.",
      );
      setActiveFrame("workspace-branch-create-error");
      return;
    }
    setWorkspaceBranchStatus("creating");
    setWorkspaceBranchError(undefined);
    const duplicate =
      !workspaceUsesHostBranches &&
      workspaceWorktrees.some((worktree) => worktree.branch === branchName);
    let response: WorkspaceGitBranchResponse;
    try {
      response = duplicate
        ? {
            code: "duplicate",
            message: `A branch named ${branchName} already exists.`,
            ok: false,
          }
        : workspaceUsesHostBranches && window.codexDemo
          ? await window.codexDemo.createAndCheckoutBranch({
              branchName,
              projectToken: projectToken ?? "",
            })
          : { branch: branchName, ok: true };
    } catch {
      response = {
        code: "unavailable",
        message: "Git could not create and checkout the branch.",
        ok: false,
      };
    }
    if (!response.ok) {
      setWorkspaceBranchStatus("error");
      setWorkspaceBranchError(response.message);
      setActiveFrame("workspace-branch-create-error");
      return;
    }
    const createdBranch: WorkspaceBranch = {
      branch: response.branch,
      id: workspaceUsesHostBranches
        ? workspaceGitBranchId(response.branch)
        : `created:${response.branch}`,
      label: response.branch,
      meta: "clean",
      status: "available",
    };
    let selectedBranchId = createdBranch.id;
    if (workspaceUsesHostBranches) {
      const previous = workspaceHostBranchesByProject[projectId];
      let nextState: WorkspaceHostBranchState =
        branchStateAfterSuccessfulCreation(
          previous?.status === "ready" ? previous : undefined,
          response.branch,
        ) ?? {
          message: "Git created the branch, but its state could not be refreshed.",
          status: "error",
        };
      try {
        const listed = await window.codexDemo?.listBranches({
          projectToken: projectToken ?? "",
        });
        if (listed?.ok) {
          nextState = {
            branches: listed.branches,
            branchesCheckedOutElsewhere:
              listed.branchesCheckedOutElsewhere,
            branchesUnavailableForCheckout:
              listed.branchesUnavailableForCheckout,
            currentBranch: listed.currentBranch,
            status: "ready",
            unbornBranch: listed.unbornBranch,
          };
        }
      } catch {
        // The successful switch remains represented as an uncommitted ref.
      }
      setWorkspaceHostBranchesByProject((current) => ({
        ...current,
        [projectId]: nextState,
      }));
      selectedBranchId = nextState.status === "ready"
        ? nextState.currentBranch
          ? workspaceGitBranchId(nextState.currentBranch)
          : unattachedWorkspaceBranchId
        : createdBranch.id;
    } else {
      setWorkspaceCreatedBranches((current) => ({
        ...current,
        [projectId]: [
          ...(current[projectId] ?? []).filter(
            (branch) => branch.branch !== response.branch,
          ),
          createdBranch,
        ],
      }));
    }
    setWorkspaceEnvironmentId("local");
    updateWorkspaceWorktreeId(selectedBranchId);
    setWorkspaceBranchDialogOpen(false);
    setWorkspaceBranchName("");
    setWorkspaceBranchStatus("idle");
    setActiveFrame("workspace-branch-created");
  };
  const selectWorkspaceBranch = async (worktree: WorkspaceBranch) => {
    const initiatingProjectId = workspaceProjectId;
    const initiatingEnvironmentId = workspaceEnvironmentId;
    const initiatingRunLocationVersion =
      workspaceRunLocationVersionRef.current;
    if (
      !initiatingProjectId ||
      worktree.checkedOutInLinkedWorktree ||
      worktree.checkoutUnavailable ||
      workspaceBranchCheckoutActiveRef.current
    ) {
      return;
    }
    const initiatingProjectToken =
      workspaceProjectTokens[initiatingProjectId] ?? "";
    if (workspaceUsesHostBranches && !initiatingProjectToken) {
      setWorkspaceBranchSwitchError(
        "Add this project from a local directory before managing its Git branches.",
      );
      setActiveFrame("workspace-branch-switch-error");
      return;
    }
    workspaceBranchCheckoutActiveRef.current = true;
    setWorkspaceBranchCheckoutPending(true);
    setWorkspaceBranchSwitchError(undefined);
    let response: WorkspaceGitBranchResponse;
    try {
      response = workspaceUsesHostBranches && window.codexDemo
        ? await window.codexDemo.checkoutBranch({
            branchName: worktree.branch,
            projectToken: initiatingProjectToken,
          })
        : { branch: worktree.branch, ok: true };
    } catch {
      response = {
        code: "unavailable",
        message: "Git could not checkout the branch.",
        ok: false,
      };
    } finally {
      workspaceBranchCheckoutActiveRef.current = false;
      setWorkspaceBranchCheckoutPending(false);
    }
    if (response.ok && workspaceUsesHostBranches) {
      setWorkspaceHostBranchesByProject((current) => {
        const previous = current[initiatingProjectId];
        if (previous?.status !== "ready") return current;
        return {
          ...current,
          [initiatingProjectId]: {
            ...previous,
            currentBranch: response.branch,
            unbornBranch: null,
          },
        };
      });
    }
    if (workspaceProjectIdRef.current !== initiatingProjectId) {
      return;
    }
    if (!response.ok) {
      setWorkspaceBranchSwitchError(response.message);
      setActiveFrame("workspace-branch-switch-error");
      return;
    }
    if (
      (workspaceUsesHostBranches ||
        initiatingEnvironmentId === "worktree") &&
      workspaceRunLocationVersionRef.current ===
        initiatingRunLocationVersion
    ) {
      setWorkspaceEnvironmentId("local");
    }
    updateWorkspaceWorktreeId(
      workspaceUsesHostBranches
        ? workspaceGitBranchId(response.branch)
        : worktree.id,
    );
    setActiveFrame("workspace-ready");
  };
  const selectWorkspaceRunLocation = (
    environmentId: "local" | "worktree",
  ) => {
    workspaceRunLocationVersionRef.current += 1;
    setWorkspaceEnvironmentId(environmentId);
    setWorkspacePage("conversation");
    setWorkspaceOverlay(null);
    setActiveFrame(
      environmentId === "worktree"
        ? currentContext26825Replay
          ? "workspace-context-current-26-825-new-worktree"
          : "workspace-new-worktree"
        : currentContext26825Replay
          ? "workspace-context-current-26-825-ready"
          : "workspace-ready",
    );
  };
  const workspaceContext = (
    <>
      <ConversationContextBar
        expandedId={
          workspaceOverlay === "project" &&
          workspaceProjectTriggerId !== "demo-workspace-project-trigger"
            ? undefined
            : (workspaceOverlay ?? undefined)
        }
        items={[
          {
            ariaLabel: workspaceProject
              ? `Change project: ${workspaceProject.label}`
              : "Choose project",
            controlsId: "demo-workspace-project-dialog",
            icon: <CurrentBuildIcon name="composer-project" />,
            id: "project",
            kind: "project",
            label: workspaceProject?.label ?? "Choose project",
            popupRole: "dialog",
            textValue: workspaceProject?.label ?? "Choose project",
            triggerId: "demo-workspace-project-trigger",
          },
          ...(workspaceProject
            ? workspaceEnvironmentId === "worktree"
              ? [
                  {
                    ariaLabel: "Select where to run the chat",
                    controlsId: "demo-workspace-environment-menu",
                    icon: (
                      <CurrentBuildIcon name="workspace-run-location-worktree" />
                    ),
                    id: "environment",
                    kind: "run-location" as const,
                    label: "New local worktree",
                    popupRole: "menu" as const,
                  },
                  {
                    ariaLabel: "Select a local environment",
                    controlsId:
                      "demo-workspace-worktree-environment-menu",
                    icon: (
                      <CurrentBuildIcon name="workspace-environment-settings" />
                    ),
                    id: "worktree-environment",
                    kind: "environment" as const,
                    label: "No environment",
                    popupRole: "menu" as const,
                  },
                  {
                    ariaLabel: "What branch should this chat start from?",
                    icon: <CurrentBuildIcon name="composer-branch" />,
                    id: "starting-state",
                    kind: "starting-state" as const,
                    label: "main",
                  },
                ]
              : [
                  {
                    ariaLabel: "Select where to run the chat",
                    controlsId: "demo-workspace-environment-menu",
                    icon: (
                      <CurrentBuildIcon name="workspace-run-location-local" />
                    ),
                    id: "environment",
                    kind: "run-location" as const,
                    label: "Local",
                    popupRole: "menu" as const,
                  },
                  {
                    ariaLabel: "Switch branch",
                    controlsId: "demo-workspace-worktree-menu",
                    disabled:
                      workspaceBranchCheckoutPending ||
                      !workspaceBranchControlAvailable,
                    icon: <CurrentBuildIcon name="composer-branch" />,
                    id: "worktree",
                    kind: "worktree" as const,
                    label: workspaceWorktree.branch,
                    popupRole: "menu" as const,
                    status: workspaceWorktree.status,
                    statusLabel: workspaceWorktree.statusLabel,
                  },
                ]
            : []),
        ]}
        onSelect={(itemId) => {
          if (itemId === "project") {
            const nextOverlay =
              workspaceOverlay === "project" ? null : "project";
            if (nextOverlay) {
              setWorkspaceProjectTriggerId(
                "demo-workspace-project-trigger",
              );
            }
            setWorkspaceOverlayState(nextOverlay);
            return;
          }
          if (itemId === "environment") {
            setWorkspaceOverlayState(
              workspaceOverlay === "environment" ? null : "environment",
            );
            return;
          }
          if (itemId === "worktree-environment") {
            setWorkspaceOverlayState(
              workspaceOverlay === "worktree-environment"
                ? null
                : "worktree-environment",
            );
            return;
          }
          if (itemId === "starting-state") return;
          setWorkspaceOverlayState(
            workspaceOverlay === "worktree" ? null : "worktree",
          );
        }}
        renderItem={(item, trigger) => {
          if (item.id === "environment") {
            const environmentTrigger = cloneElement(trigger, {
              ref: workspaceEnvironmentTriggerRef,
            });
            return (
              <Menu
                align="start"
                className={`demo-workspace-context-menu demo-workspace-environment-menu${
                  currentContext26825Replay
                    ? " demo-workspace-context-menu--current-26-825"
                    : ""
                }`}
                label="Work in"
                onOpenChange={(open) =>
                  setWorkspaceOverlayState(open ? "environment" : null)
                }
                open={workspaceOverlay === "environment"}
                side="top"
                sideOffset={1}
                trigger={environmentTrigger}
                width="auto"
              >
                <MenuSectionLabel>Work in</MenuSectionLabel>
                <MenuItem
                  endIcon={
                    workspaceEnvironmentId === "local" ? (
                      <CurrentBuildIcon name="workspace-selection-check" />
                    ) : undefined
                  }
                  onSelect={() => selectWorkspaceRunLocation("local")}
                  startIcon={
                    <CurrentBuildIcon name="workspace-run-location-local" />
                  }
                >
                  Local
                </MenuItem>
                <MenuItem
                  endIcon={
                    workspaceEnvironmentId === "worktree" ? (
                      <CurrentBuildIcon name="workspace-selection-check" />
                    ) : undefined
                  }
                  onSelect={() => selectWorkspaceRunLocation("worktree")}
                  startIcon={
                    <CurrentBuildIcon name="workspace-run-location-worktree" />
                  }
                >
                  New local worktree
                </MenuItem>
                <MenuLinkItem
                  endIcon={
                    <CurrentBuildIcon name="workspace-run-location-external" />
                  }
                  href="https://chatgpt.com/codex/cloud"
                  startIcon={
                    <CurrentBuildIcon name="workspace-run-location-codex-web" />
                  }
                >
                  Connect Codex web
                </MenuLinkItem>
                <MenuItem
                  disabled
                  startIcon={
                    <CurrentBuildIcon name="workspace-run-location-send-cloud" />
                  }
                >
                  Cloud
                </MenuItem>
                <div
                  aria-hidden="true"
                  className="demo-workspace-context-menu__divider"
                />
                <MenuItem
                  endIcon={
                    <CurrentBuildIcon name="workspace-run-location-usage-chevron" />
                  }
                  startIcon={
                    <CurrentBuildIcon name="workspace-run-location-usage" />
                  }
                >
                  Usage remaining
                </MenuItem>
              </Menu>
            );
          }
          if (item.id === "worktree-environment") {
            return (
              <Menu
                align="start"
                className={`demo-workspace-context-menu demo-workspace-worktree-environment-menu${
                  currentContext26825Replay
                    ? " demo-workspace-context-menu--current-26-825"
                    : ""
                }`}
                initialFocus="none"
                label="Environment"
                onOpenChange={(open) =>
                  setWorkspaceOverlayState(
                    open ? "worktree-environment" : null,
                  )
                }
                open={workspaceOverlay === "worktree-environment"}
                side="top"
                sideOffset={1}
                trigger={trigger}
                width="auto"
              >
                <MenuSectionLabel>Environment</MenuSectionLabel>
                <MenuItem
                  endIcon={
                    <CurrentBuildIcon name="workspace-selection-check" />
                  }
                >
                  Work without environment
                </MenuItem>
                <MenuItem
                  endIcon={
                    <CurrentBuildIcon name="workspace-environment-settings" />
                  }
                  onSelect={() => {
                    setWorkspaceOverlay(null);
                    setWorkspacePage("environments");
                    setActiveFrame("workspace-environments-unavailable");
                  }}
                >
                  Set up project
                </MenuItem>
              </Menu>
            );
          }
          if (item.id === "worktree") {
            const worktreeTrigger = cloneElement(trigger, {
              ref: workspaceWorktreeTriggerRef,
            });
            return (
              <Menu
                align="start"
                className={`demo-workspace-context-menu demo-workspace-worktree-menu${
                  currentContext26825Replay
                    ? " demo-workspace-context-menu--current-26-825"
                    : ""
                }`}
                label="Branches"
                onOpenChange={(open) => {
                  if (!open) setWorkspaceBranchQuery("");
                  setWorkspaceOverlayState(open ? "worktree" : null);
                }}
                open={workspaceOverlay === "worktree"}
                side="top"
                sideOffset={1}
                trigger={worktreeTrigger}
                width="auto"
              >
                {currentContext26825Replay ? (
                  <div className="demo-workspace-worktree-menu__search">
                    <CurrentBuildIcon name="sidebar-search" />
                    <input
                      aria-label="Search branches"
                      onChange={(event) =>
                        setWorkspaceBranchQuery(event.currentTarget.value)
                      }
                      placeholder={`Search ${workspaceProject?.label ?? "project"} branches`}
                      type="search"
                      value={workspaceBranchQuery}
                    />
                  </div>
                ) : (
                  <input
                    aria-label="Search branches"
                    onChange={(event) =>
                      setWorkspaceBranchQuery(event.currentTarget.value)
                    }
                    placeholder="Search branches"
                    type="search"
                    value={workspaceBranchQuery}
                  />
                )}
                <MenuSectionLabel>Branches</MenuSectionLabel>
                <div className="demo-workspace-worktree-menu__branches">
                  {filteredWorkspaceWorktrees.map((worktree) => (
                    <MenuItem
                      aria-checked={
                        currentContext26825Replay
                          ? undefined
                          : worktree.id === workspaceWorktreeId
                      }
                      disabled={
                        !workspaceBranchOperationsAvailable ||
                        worktree.checkedOutInLinkedWorktree ||
                        worktree.checkoutUnavailable
                      }
                      endIcon={
                        worktree.id === workspaceWorktreeId
                          ? currentContext26825Replay
                            ? <CurrentBuildIcon name="workspace-selection-check" />
                            : "✓"
                          : undefined
                      }
                      key={worktree.id}
                      onSelect={() => {
                        void selectWorkspaceBranch(worktree);
                      }}
                      role={
                        currentContext26825Replay
                          ? "menuitem"
                          : "menuitemradio"
                      }
                      startIcon={
                        currentContext26825Replay ? (
                          <CurrentBuildIcon name="composer-branch" />
                        ) : (
                          "⑂"
                        )
                      }
                      subText={
                        worktree.checkedOutInLinkedWorktree
                          ? "Checked out in another worktree"
                          : worktree.checkoutUnavailable
                            ? "Unavailable for checkout"
                          : undefined
                      }
                    >
                      {worktree.branch}
                    </MenuItem>
                  ))}
                </div>
                <MenuSeparator />
                {currentContext26825Replay ? null : (
                  <MenuItem
                    onSelect={() =>
                      openWorkspaceLocalEnvironment("worktree")
                    }
                    startIcon={<CurrentBuildIcon name="composer-worktree" />}
                  >
                    Select local environment…
                  </MenuItem>
                )}
                <MenuItem
                  disabled={!workspaceBranchOperationsAvailable}
                  onSelect={openWorkspaceBranchCreation}
                  startIcon="＋"
                >
                  Create and checkout new branch…
                </MenuItem>
              </Menu>
            );
          }
          return trigger;
        }}
      />
      {workspaceBranchSwitchError ? (
        <StatusBanner heading="Couldn’t checkout branch" tone="error">
          {workspaceBranchSwitchError}
        </StatusBanner>
      ) : null}
      {workspaceBranchCheckoutPending ? (
        <StatusBanner heading="Switching branch" tone="info">
          Waiting for the current Git checkout to finish.
        </StatusBanner>
      ) : null}
      {workspaceUsesHostBranches &&
      workspaceProjectId &&
      !workspaceProjectToken ? (
        <StatusBanner heading="Branch operations unavailable" tone="info">
          Add this project from a local directory before managing its Git
          branches.
        </StatusBanner>
      ) : null}
      {workspaceUsesHostBranches &&
      workspaceProjectToken &&
      workspaceHostBranchState?.status === "loading" ? (
        <StatusBanner heading="Loading branches" tone="info">
          Reading the selected project’s local Git branches.
        </StatusBanner>
      ) : null}
      {workspaceUsesHostBranches &&
      workspaceProjectToken &&
      workspaceHostBranchState?.status === "error" ? (
        <StatusBanner heading="Branch operations unavailable" tone="error">
          {workspaceHostBranchState.message}
        </StatusBanner>
      ) : null}
      {workspaceOverlay === "project" ? (
        <div
          aria-label="Choose a project"
          className="demo-workspace-project-dialog"
          id="demo-workspace-project-dialog"
          role="dialog"
        >
          {currentContext26825Replay ? (
            <div className="demo-workspace-project-dialog__search">
              <CurrentBuildIcon name="sidebar-search" />
              <input
                aria-label="Search projects"
                autoFocus
                onChange={(event) =>
                  setWorkspaceProjectQuery(event.currentTarget.value)
                }
                placeholder="Search projects"
                type="search"
                value={workspaceProjectQuery}
              />
            </div>
          ) : (
            <input
              aria-label="Search projects"
              autoFocus
              onChange={(event) =>
                setWorkspaceProjectQuery(event.currentTarget.value)
              }
              placeholder="Search projects"
              type="search"
              value={workspaceProjectQuery}
            />
          )}
          <ConversationProjectListbox
            dismissBoundaryId="demo-workspace-project-dialog"
            initialFocus="none"
            items={filteredWorkspaceProjects}
            label="Suggestions"
            onDismiss={() => {
              setWorkspaceOverlayState(null);
            }}
            onSelect={(projectId) => {
              if (projectId === workspaceNewProjectOptionId) {
                void createProject("workspace");
                return;
              }
              if (projectId === workspaceNoProjectOptionId) {
                openWorkspace(null);
                setActiveFrame(
                  currentContext26825Replay
                    ? "workspace-context-current-26-825-no-project"
                    : "workspace-no-project",
                );
                setWorkspaceProjectQuery("");
                return;
              }
              updateWorkspaceProjectId(projectId);
              setWorkspaceEnvironmentId("local");
              updateWorkspaceWorktreeId("main");
              setWorkspaceOverlayState(null);
              setActiveFrame(
                currentContext26825Replay
                  ? "workspace-context-current-26-825-ready"
                  : "workspace-ready",
              );
              setWorkspaceProjectQuery("");
            }}
            pinnedItems={workspaceProjectPinnedItems}
            selectedIcon={
              currentContext26825Replay ? (
                <CurrentBuildIcon name="workspace-selection-check" />
              ) : undefined
            }
            selectedId={
              workspaceProjectId ?? workspaceNoProjectOptionId
            }
            triggerId={workspaceProjectTriggerId}
          />
          {filteredWorkspaceProjects.length === 0 ? (
            <p
              aria-live="polite"
              className="demo-workspace-project-dialog__empty"
              role="status"
            >
              No projects found
            </p>
          ) : null}
          {projectCreationStatus === "error" &&
          projectCreationSource === "workspace" ? (
            <p className="demo-workspace-project-dialog__error" role="alert">
              Couldn&apos;t add that project
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
  const currentQueue26825Running =
    currentQueue26825Phase === "pending" ||
    currentQueue26825Phase === "resumed" ||
    currentQueue26825Phase === "continued";
  const workspaceComposerSurface = (
    <AgentComposer
      actions={
        <span className="demo-composer-controls">
          <button
            aria-label="Add files and more"
            onClick={() =>
              setComposerOverlay((current) =>
                current === "resources" ? null : "resources",
              )
            }
            type="button"
          >
            <CurrentBuildIcon name="composer-add-files" />
          </button>
          {currentComposerControls26825Replay ? (
            <ComposerPermissionMenu
              align="start"
              className="codex-ui-composer-permission-menu--current-26-825"
              heading="How should ChatGPT actions be approved?"
              initialFocus="none"
              learnMore="Learn more"
              onOpenChange={(open) =>
                setComposerOverlay(open ? "permissions" : null)
              }
              onSelect={(option) => {
                setComposerPermissionId(option.id);
                setComposerOverlay(null);
              }}
              open={composerOverlay === "permissions"}
              optionRole="menuitem"
              options={currentComposerPermissionOptions}
              selectedIcon={
                <CurrentBuildIcon name="workspace-selection-check" />
              }
              selectedId={selectedComposerPermission.id}
              side="top"
              sideOffset={1.5}
              trigger={
                <button
                  aria-label="Change permissions"
                  className="demo-composer-permission-trigger"
                  type="button"
                >
                  <CurrentBuildIcon
                    name={
                      selectedComposerPermission.id === "ask"
                        ? "composer-permission-ask"
                        : "composer-permission"
                    }
                  />
                  {selectedComposerPermission.label}
                </button>
              }
            />
          ) : (
            <button aria-label="Change permissions" type="button">
              <CurrentBuildIcon name="composer-permission" />
              Full access
            </button>
          )}
          {currentComposerControls26825Replay && composerMode ? (
            <ComposerModeIndicator
              clearLabel={composerMode === "goal" ? "Clear goal" : "Plan"}
              kind={composerMode}
              label={composerMode === "goal" ? "Goal" : "Plan"}
              onClear={() => {
                setComposerMode(null);
                requestAnimationFrame(() => composerInputRef.current?.focus());
              }}
            />
          ) : null}
        </span>
      }
      controls={
        <span className="demo-composer-actions">
          <span className="demo-workspace-model">
            <span>5.6 Sol</span>
            <span>Extra High</span>
            <CurrentBuildIcon name="composer-model-chevron" />
          </span>
          <button aria-label="Dictate" type="button">
            <CurrentBuildIcon name="composer-dictate" />
          </button>
          {!composerValue.trim() && !currentComposerQueue26825Replay ? (
            <button
              aria-label="Start new voice chat"
              className="demo-workspace-voice"
              type="button"
            >
              <CurrentBuildIcon name="composer-voice" />
            </button>
          ) : null}
        </span>
      }
      isRunning={currentComposerQueue26825Replay && currentQueue26825Running}
      layout="multiline"
      onResume={
        currentComposerQueue26825Replay &&
        (currentQueue26825Phase === "paused" ||
          currentQueue26825Phase === "resume-ready")
          ? resumeCurrentQueuePrimary
          : undefined
      }
      onStop={
        currentComposerQueue26825Replay && currentQueue26825Running
          ? stopComposer
          : undefined
      }
      onSubmit={(prompt) => {
        if (currentComposerQueue26825Replay) {
          if (!currentQueue26825Running) return;
          queuedPromptCounterRef.current += 1;
          setQueuedPrompts((items) => [
            ...items,
            {
              id: `current-queue-${queuedPromptCounterRef.current}`,
              text: prompt,
            },
          ]);
          setComposerValue("");
          return;
        }
        if (projectIndexChat) {
          const nextPrompt = prompt.trim();
          if (!nextPrompt) return;
          setProjectIndexChatTurns((turns) => [
            ...turns,
            {
              id: projectIndexChatTurnCounterRef.current++,
              prompt: nextPrompt,
              response: "The selected project chat has been updated.",
            },
          ]);
          setComposerValue("");
          setActiveFrame("projects-index-chat");
          return;
        }
        if (workspacePersistenceFrame) {
          const nextPrompt = prompt.trim();
          if (!nextPrompt) return;
          setWorkspaceModelOnlyTurns((turns) => [
            ...turns,
            {
              id: workspaceModelOnlyTurnCounterRef.current++,
              prompt: nextPrompt,
              response: workspaceDirectoryMissing
                ? "MODEL-ONLY WORKTREE TURN COMPLETE."
                : "MODEL-ONLY TURN COMPLETE.",
            },
          ]);
          setComposerValue("");
          setActiveFrame(
            workspaceDirectoryMissing
              ? "workspace-directory-missing"
              : "workspace-persisted-thread",
          );
          return;
        }
        selectScenario("workspace-workflow", "approval-pending", {
          cwd: currentWorkspaceCwd,
          prompt,
          projectLabel: workspaceProject?.label ?? "Workspace",
        });
      }}
      onValueChange={setComposerValue}
      placeholder={
        composerMode === "goal"
          ? "Describe your goal, define measurable outcomes for best results"
          : composerMode === "plan"
            ? "Describe your task to generate a plan..."
            : "Do anything"
      }
      ref={composerInputRef}
      suggestions={
        currentComposerControls26825Replay &&
        composerOverlay === "resources" ? (
          <ComposerResourcePicker
            activeId={composerResourceActiveId}
            className="codex-ui-composer-resource-picker--current-26-825"
            descriptionSeparator=""
            groups={currentComposerResourceGroups}
            onActiveIdChange={setComposerResourceActiveId}
            onDismiss={() => {
              setComposerOverlay(null);
              requestAnimationFrame(() => composerInputRef.current?.focus());
            }}
            onSelect={(option) => {
              setComposerResourceActiveId(option.id);
              if (option.id === "goal" || option.id === "plan") {
                setComposerMode(option.id);
                setComposerValue("");
              }
              setComposerOverlay(null);
              requestAnimationFrame(() => composerInputRef.current?.focus());
            }}
          />
        ) : undefined
      }
      textareaLabel={
        composerMode === "goal"
          ? "Describe your goal, define measurable outcomes for best results"
          : composerMode === "plan"
            ? "Describe your task to generate a plan..."
            : "Do anything"
      }
      value={composerValue}
    />
  );
  const workspaceComposer = currentComposerQueue26825Replay ? (
    <ComposerDock
      className="demo-current-composer-queue-dock"
      composer={workspaceComposerSurface}
      queue={
        queuedPrompts.length > 0 ? (
          <QueuedPromptList
            interrupted={queueInterrupted}
            items={queuedPrompts}
            onDelete={deleteQueuedPrompt}
            onEdit={editQueuedPrompt}
            onQueueingChange={setQueueingEnabled}
            onReorder={reorderQueuedPrompts}
            onResume={resumeQueue}
            onSendNow={sendQueuedPromptNow}
            queueingEnabled={queueingEnabled}
          />
        ) : undefined
      }
    />
  ) : (
    workspaceComposerSurface
  );
  const workspaceNewConversationRoute = (
    <div className="demo-workspace-route">
      <NewConversationStart
        className="demo-workspace-start"
        composer={workspaceComposer}
        context={workspaceContext}
        destination={
          workspaceProject ? (
            <>
              What should we build in{" "}
              <button
                aria-controls="demo-workspace-project-dialog"
                aria-expanded={
                  workspaceOverlay === "project" &&
                  workspaceProjectTriggerId ===
                    "demo-workspace-destination-trigger"
                }
                aria-haspopup="dialog"
                className="demo-workspace-destination"
                id="demo-workspace-destination-trigger"
                onClick={() => {
                  setWorkspaceProjectTriggerId(
                    "demo-workspace-destination-trigger",
                  );
                  setWorkspaceOverlayState("project");
                }}
                type="button"
              >
                {workspaceProject.label}?
              </button>
            </>
          ) : (
            "What should we build?"
          )
        }
        eyebrow={
          currentHomeFrame || currentContext26825Replay ? (
            <CurrentBuildIcon
              className="demo-current-home-mark"
              name="home-mark"
            />
          ) : (
            <span aria-hidden="true" className="demo-workspace-mark">
              ⌁
            </span>
          )
        }
        label="New coding workspace"
        prompt={
          currentHomeFrame ? (
            <NewConversationPromptGrid
              className="demo-current-home-prompts"
              onSelect={(option) =>
                setComposerValue(option.prompt ?? option.label)
              }
              options={[
                {
                  icon: (
                    <CurrentBuildIcon
                      className="demo-current-home-icon--explore"
                      name="home-suggestion-explore"
                    />
                  ),
                  id: "explore",
                  label: "Explore and understand code",
                },
                {
                  icon: (
                    <CurrentBuildIcon
                      className="demo-current-home-icon--build"
                      name="home-suggestion-build"
                    />
                  ),
                  id: "build",
                  label: "Build a new feature, app, or tool",
                },
                {
                  icon: (
                    <CurrentBuildIcon
                      className="demo-current-home-icon--review"
                      name="home-suggestion-review"
                    />
                  ),
                  id: "review",
                  label: "Review code and suggest changes",
                },
                {
                  icon: (
                    <CurrentBuildIcon
                      className="demo-current-home-icon--fix"
                      name="home-suggestion-fix"
                    />
                  ),
                  id: "fix",
                  label: "Fix issues and failures",
                },
              ]}
            />
          ) : currentContext26825Replay ? (
            <div className="demo-workspace-prompts demo-workspace-prompts--current-context">
              <button
                onClick={() =>
                  setComposerValue(
                    "Complete the current context-controls parity slice.",
                  )
                }
                type="button"
              >
                <SidebarGlyph name="thread" />
                <span>Complete the current context-controls parity slice</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : workspaceProject ? (
            <div className="demo-workspace-prompts">
              <button
                onClick={() =>
                  setComposerValue(
                    "Review the latest workspace changes and prepare delivery.",
                  )
                }
                type="button"
              >
                <SidebarGlyph name="thread" />
                <span>Review the latest workspace changes</span>
                <span aria-hidden="true">→</span>
              </button>
              <button
                onClick={() =>
                  setComposerValue(
                    "Plan the next component parity slice and its verification.",
                  )
                }
                type="button"
              >
                <SidebarGlyph name="thread" />
                <span>Plan the next component parity slice</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>
          ) : undefined
        }
      />
      <LocalEnvironmentDialog
        createAction={
          <Button
            onClick={() => {
              setWorkspaceEnvironmentId("worktree");
              closeWorkspaceLocalEnvironment();
            }}
            size="small"
            tone="primary"
          >
            Create worktree
          </Button>
        }
        groups={workspaceLocalEnvironmentGroups}
        id="demo-workspace-local-environment-dialog"
        onOpenChange={(open) => {
          if (open) {
            setWorkspaceLocalEnvironmentOpen(true);
            return;
          }
          closeWorkspaceLocalEnvironment();
        }}
        onQueryChange={setWorkspaceEnvironmentQuery}
        onSelect={(groupId, itemId) => {
          updateWorkspaceProjectId(groupId);
          setWorkspaceEnvironmentId("local");
          updateWorkspaceWorktreeId(
            itemId,
            !workspaceUsesHostBranches ||
              !hostSelectionUsesInPlaceBranch(itemId),
          );
          closeWorkspaceLocalEnvironment();
        }}
        open={workspaceLocalEnvironmentOpen}
        query={workspaceEnvironmentQuery}
        returnFocusRef={
          workspaceEnvironmentLauncher === "worktree"
            ? workspaceWorktreeTriggerRef
            : workspaceEnvironmentTriggerRef
        }
        title="Select local environment"
      />
      <BranchCreationDialog
        branchName={workspaceBranchName}
        error={workspaceBranchError}
        onBranchNameChange={(branchName) => {
          setWorkspaceBranchName(branchName);
          if (workspaceBranchError) {
            setWorkspaceBranchError(undefined);
            setWorkspaceBranchStatus("idle");
          }
        }}
        onCreate={(branchName) => {
          void createWorkspaceBranch(branchName);
        }}
        onOpenChange={(open) => {
          if (open) {
            setWorkspaceBranchDialogOpen(true);
            return;
          }
          closeWorkspaceBranchCreation();
        }}
        onSetPrefix={() => {
          setWorkspaceBranchDialogOpen(false);
          setWorkspaceBranchName("");
          setWorkspaceBranchError(undefined);
          setWorkspaceBranchStatus("idle");
          setSettingsQuery("");
          setSelectedSettingsId("git");
          setSettingsRouteFocusPending(true);
          setWorkspacePage("git-settings");
          setActiveFrame("workspace-git-settings");
        }}
        open={workspaceBranchDialogOpen}
        returnFocusRef={workspaceWorktreeTriggerRef}
        status={workspaceBranchStatus}
      />
    </div>
  );
  const workspaceThreadMissing = workspaceDirectoryMissing;
  const workspaceThreadSummary = (
    <ThreadSummaryPopover
      className="demo-workspace-thread-summary-popover"
      label="Workspace summary"
      onOpenChange={setThreadSummaryOpen}
      open={threadSummaryOpen}
      triggerLabel="Toggle workspace summary"
    >
      <ThreadSummaryPanel
        className="demo-workspace-thread-summary"
        label="Workspace summary"
      >
        <ThreadSummarySection
          actions={
            <ThreadSummaryIconButton icon="+" label="Add environment item" />
          }
          collapsible
          title="Environment"
          toggleLabel="Toggle environment summary"
        >
          <ThreadSummaryItem
            disabled
            label="Changes"
            leading={<SummaryGlyph name="changes" />}
          />
          <ThreadSummaryItem
            label="Worktree"
            leading={<SummaryGlyph name="computer" />}
            trailing="⌄"
          />
          <ThreadSummaryItem
            label="main"
            leading={<SummaryGlyph name="branch" />}
            trailing="⌄"
          />
          <ThreadSummaryItem
            disabled
            label="Commit or push"
            leading={<SummaryGlyph name="commit" />}
          />
          <ThreadSummaryItem
            disabled
            label={
              workspaceThreadMissing
                ? "Pull request status unavailable"
                : "No pull request"
            }
            leading={<SummaryGlyph name="github" />}
          />
        </ThreadSummarySection>
        <ThreadSummarySection
          actions={
            <ThreadSummaryIconButton icon="+" label="Create a file or site" />
          }
          collapsible
          title="Outputs"
          toggleLabel="Toggle outputs summary"
        >
          <ThreadSummaryItem disabled label="Create a file or site" />
        </ThreadSummarySection>
      </ThreadSummaryPanel>
    </ThreadSummaryPopover>
  );
  const workspacePersistedThread = (
    <div className="demo-workspace-route demo-workspace-persisted-route">
      <ConversationThreadShell
        className="demo-workspace-persisted-thread"
        composer={
          <div className="demo-workspace-persisted-composer">
            {workspaceThreadMissing ? (
              <WorkingDirectoryNotice aria-label="Workspace status" />
            ) : null}
            {workspaceComposer}
          </div>
        }
        header={
          <ThreadHeader
            endActions={workspaceThreadSummary}
            startActions={
              <button aria-label="Thread actions" type="button">
                <SidebarGlyph name="more-current" />
              </button>
            }
            title={
              <span className="demo-workspace-persisted-title">
                <SidebarGlyph name="folder-current" />
                Verify worktree persistence
              </span>
            }
          />
        }
        label="Persisted worktree conversation"
        threadWidth="wide"
      >
        <AgentTurn aria-label="Persisted worktree transcript">
          <AgentMessage role="user">
            Create no files and reply exactly WORKTREE PERSISTENCE PROBE READY.
          </AgentMessage>
          <AgentMessage
            actions={
              <McpResponseActions
                includeFork={false}
                label="Persisted response actions"
              />
            }
            metadata={<time dateTime="17:34">5:34 PM</time>}
            role="assistant"
          >
            <AgentMarkdown>WORKTREE PERSISTENCE PROBE READY.</AgentMarkdown>
          </AgentMessage>
          {workspaceThreadMissing ? (
            <>
              <AgentMessage role="user">
                Reply exactly MISSING WORKTREE PROBE.
              </AgentMessage>
              <AgentMessage
                actions={
                  <McpResponseActions
                    includeFork={false}
                    label="Missing worktree response actions"
                  />
                }
                role="assistant"
              >
                <AgentMarkdown>MISSING WORKTREE PROBE.</AgentMarkdown>
              </AgentMessage>
            </>
          ) : null}
          {workspaceModelOnlyTurns.map((turn) => (
            <Fragment key={turn.id}>
              <AgentMessage role="user">{turn.prompt}</AgentMessage>
              <AgentMessage
                actions={
                  <McpResponseActions
                    includeFork={false}
                    label="Model-only response actions"
                  />
                }
                role="assistant"
              >
                <AgentMarkdown>{turn.response}</AgentMarkdown>
              </AgentMessage>
            </Fragment>
          ))}
        </AgentTurn>
      </ConversationThreadShell>
    </div>
  );
  const projectIndexChatRoute = projectIndexChat ? (
    <div
      className="demo-workspace-route demo-project-index-chat-route"
      data-chat-id={projectIndexChat.chatId}
      data-project-id={projectIndexChat.projectId}
    >
      <ConversationThreadShell
        className="demo-project-index-chat-thread"
        composer={workspaceComposer}
        header={
          <ThreadHeader
            startActions={
              <button aria-label="Thread actions" type="button">
                <SidebarGlyph name="more-current" />
              </button>
            }
            title={projectIndexChat.chatLabel}
          />
        }
        label={`Project chat ${projectIndexChat.chatLabel}`}
        threadWidth="wide"
      >
        <AgentTurn aria-label="Project chat transcript">
          <AgentMessage role="user">
            Continue this project conversation from the saved context.
          </AgentMessage>
          <AgentMessage role="assistant">
            The selected project chat is ready to continue.
          </AgentMessage>
        </AgentTurn>
        {projectIndexChatTurns.map((turn) => (
          <AgentTurn aria-label="Continued project chat turn" key={turn.id}>
            <AgentMessage role="user">{turn.prompt}</AgentMessage>
            <AgentMessage role="assistant">{turn.response}</AgentMessage>
          </AgentTurn>
        ))}
      </ConversationThreadShell>
    </div>
  ) : null;
  const workspaceEnvironmentSettingsRoute = (
    <div className="demo-workspace-environment-settings-route">
      <EnvironmentSettingsPage status="unavailable" />
    </div>
  );
  const settingsNavigation = [
    {
      id: "personal",
      label: "Personal",
      items: [
        ["general", "General"],
        ["import", "Import"],
        ["profile", "Profile"],
        ["appearance", "Appearance", "GitHub"],
        ["voice", "Voice"],
        ["configuration", "Configuration", "Choose how ChatGPT summarizes its reasoning"],
        ["personalization", "Personalization", "Personalization"],
        ["pets", "Pets"],
        ["keyboard-shortcuts", "Keyboard shortcuts", "Go to a line in the current file"],
        ["usage-billing", "Usage & billing", "GitHub"],
        ["account", "Account"],
      ],
    },
    {
      id: "integrations",
      label: "Integrations",
      items: [
        ["computer-use", "Computer use", "Computer use"],
        ["computer-history", "Computer history"],
        ["appshots", "Appshots"],
        ["plugins", "Plugins"],
        [
          "browser",
          "Browser",
          "Allow ChatGPT to use full Chrome DevTools Protocol (CDP) access in connected Browser Use sessions.",
        ],
      ],
    },
    {
      id: "coding",
      label: "Coding",
      items: [
        ["hooks", "Hooks", "Right before ChatGPT ends its turn"],
        [
          "connections",
          "Connections",
          "Allow ChatGPT apps signed into your account to use this device",
        ],
        ["git", "Git", "Git"],
        ["environments", "Environments"],
        [
          "worktrees",
          "Worktrees",
          "Automatic deletion is disabled. ChatGPT will not prune old worktrees automatically.",
        ],
      ],
    },
    {
      id: "archived",
      label: "Archived",
      items: [["archived-chats", "Archived chats"]],
    },
  ].map((section) => ({
    ...section,
    items: section.items.map(([id, label, resultLabel]) => ({
      icon: (
        <span className="demo-settings-navigation-icon-stack">
          <CurrentBuildIcon
            name={`settings-${id}` as CurrentBuildIconName}
          />
        </span>
      ),
      id,
      keywords:
        id === "appearance" || id === "usage-billing"
          ? ["git", "github"]
          : id === "hooks" || id === "keyboard-shortcuts"
            ? ["git"]
            : id === "browser" || id === "computer-use" || id === "connections" || id === "worktrees"
              ? ["git"]
              : undefined,
      label,
      resultLabel,
      trailingIcon:
        id === "account" ? (
          <CurrentBuildIcon name="settings-account-external" />
        ) : undefined,
    })),
  }));
  const workspaceSettingsRoute = (
    <SettingsShell
      backIcon={<CurrentBuildIcon name="settings-back" />}
      backButtonRef={settingsBackButtonRef}
      onBack={() => {
        setSettingsQuery("");
        setWorkspacePage("conversation");
        setActiveFrame(
          workspaceEnvironmentId === "worktree"
            ? "workspace-new-worktree"
            : "workspace-ready",
        );
      }}
      onQueryChange={setSettingsQuery}
      onSelect={(itemId) => {
        if (
          itemId !== "appearance" &&
          itemId !== "general" &&
          itemId !== "git" &&
          itemId !== "hooks" &&
          itemId !== "keyboard-shortcuts" &&
          itemId !== "personalization" &&
          itemId !== "usage-billing" &&
          itemId !== "voice" &&
          itemId !== "worktrees"
        ) {
          return;
        }
        setSelectedSettingsId(itemId);
        if (itemId !== "personalization") setPersonalizationMenuOpen(false);
        if (itemId !== "voice") {
          setVoiceMicrophoneMenuOpen(false);
          setVoicePickerOpen(false);
          setVoiceCapturingHotkey(null);
        }
        if (itemId !== "keyboard-shortcuts") {
          setKeyboardShortcutCaptureTarget(null);
          setKeyboardShortcutQuery("");
        }
        setWorkspacePage(
          itemId === "appearance"
            ? "appearance-settings"
            : itemId === "general"
              ? "general-settings"
              : itemId === "personalization"
                ? "personalization-settings"
              : itemId === "keyboard-shortcuts"
                ? "keyboard-shortcuts-settings"
              : itemId === "usage-billing"
                ? "usage-settings"
              : itemId === "voice"
                ? "voice-settings"
              : itemId === "hooks"
                ? "hooks-settings"
              : itemId === "worktrees"
                ? "worktree-settings"
              : "git-settings",
        );
        setActiveFrame(
          itemId === "appearance"
            ? "workspace-appearance-settings"
            : itemId === "general"
              ? "workspace-general-settings"
              : itemId === "personalization"
                ? "workspace-personalization-settings"
              : itemId === "keyboard-shortcuts"
                ? "workspace-keyboard-shortcuts"
              : itemId === "usage-billing"
                ? "workspace-usage-settings"
              : itemId === "voice"
                ? "workspace-voice-settings"
              : itemId === "hooks"
                ? "workspace-hooks-settings"
              : itemId === "worktrees"
                ? "workspace-worktree-settings"
              : "workspace-git-settings",
        );
      }}
      query={settingsQuery}
      searchIcon={<CurrentBuildIcon name="settings-search" />}
      sections={settingsNavigation}
      selectedId={selectedSettingsId}
    >
      {workspacePage === "hooks-settings" ? (
        <>
          <HooksSettingsPage
            data-evidence="runtime-observed"
            entries={hookSettingsEntries}
            learnMoreHref="https://developers.openai.com/codex/hooks"
            onOpenConfig={(entry) =>
              setHooksSettingsAction(
                `Open config requested for ${entry.title ?? entry.event}`,
              )
            }
            onReload={() => {
              setHooksSettingsAction("");
              setHooksRefreshing(true);
              window.setTimeout(() => {
                setHookSettingsStatus("ready");
                setHooksRefreshing(false);
                setHooksSettingsAction("Refreshed hooks");
              }, 180);
            }}
            onToggleHookEnabled={(entry, enabled) =>
              setHookSettingsEntries((entries) =>
                entries.map((candidate) =>
                  candidate.id === entry.id
                    ? { ...candidate, enabled }
                    : candidate,
                ),
              )
            }
            onTrustHook={(entry) =>
              setHookSettingsEntries((entries) =>
                entries.map((candidate) =>
                  candidate.id === entry.id
                    ? {
                        ...candidate,
                        changedSinceTrusted: false,
                        trusted: true,
                      }
                    : candidate,
                ),
              )
            }
            refreshing={hooksRefreshing}
            reloadIcon={<CurrentBuildIcon name="settings-hooks-reload" />}
            status={hookSettingsStatus}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {hooksSettingsAction}
          </span>
        </>
      ) : workspacePage === "worktree-settings" ? (
        <>
          <WorktreeSettingsPage
            data-evidence="runtime-observed"
            entries={managedWorktreeEntries}
            onChange={setWorktreeSettings}
            onDelete={(entry) => {
              setManagedWorktreeEntries((entries) =>
                entries.filter((candidate) => candidate.id !== entry.id),
              );
              setWorktreeSettingsAction("Managed worktree deleted");
            }}
            onNewChat={() =>
              setWorktreeSettingsAction("New chat requested in managed worktree")
            }
            onRefresh={() => {
              setWorktreeSettingsAction("");
              setWorktreeSettingsRefreshing(true);
              window.setTimeout(() => {
                if (
                  activeFrame === "workspace-worktree-settings-missing-refresh"
                ) {
                  setManagedWorktreeEntries([]);
                  setWorktreeSettingsAction("Missing worktree removed");
                } else {
                  setWorktreeSettingsAction("Managed worktrees refreshed");
                }
                setWorktreeSettingsRefreshing(false);
              }, 180);
            }}
            refreshing={worktreeSettingsRefreshing}
            rootPlaceholder="/Users/demo/.codex/worktrees"
            value={worktreeSettings}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {worktreeSettingsAction}
          </span>
        </>
      ) : workspacePage === "code-review-settings" ? (
        <CodeReviewSettingsPage
          data-evidence="package-observed"
          onChange={setCodeReviewSettings}
          onRetry={() => undefined}
          showCreditPreference
          value={codeReviewSettings}
        />
      ) : workspacePage === "appearance-settings" ? (
        <>
          <AppearanceSettingsPage
            chatGptDockIcon={<CurrentBuildIcon name="settings-account" />}
            codexDockIcon={
              <span className="demo-codex-dock-icon" aria-hidden="true">
                C
              </span>
            }
            onChange={setAppearanceSettings}
            onCopyTheme={(theme) =>
              setAppearanceThemeAction(`${theme} theme copied`)
            }
            onImportTheme={(theme) =>
              setAppearanceThemeAction(`${theme} theme import requested`)
            }
            value={appearanceSettings}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {appearanceThemeAction}
          </span>
        </>
      ) : workspacePage === "general-settings" ? (
        <>
          <GeneralSettingsPage
            elevatedRiskHref="https://help.openai.com/"
            fileDestinationOptions={[
              { icon: <DemoVsCodeIcon />, label: "VS Code", value: "vscode" },
              { label: "Cursor", value: "cursor" },
              { label: "Sublime Text", value: "sublime-text" },
              { label: "Default app", value: "default-app" },
              { label: "Finder", value: "finder" },
              { label: "Terminal", value: "terminal" },
              { label: "Xcode", value: "xcode" },
            ]}
            hotkeyCaptureActive={generalHotkeyCaptureActive}
            onCancelHotkeyCapture={() => setGeneralHotkeyCaptureActive(false)}
            onChange={setGeneralSettings}
            onChangeProjectlessTaskFolder={() =>
              setGeneralSettingsAction("Projectless task folder change requested")
            }
            onOpenSourceLicenses={() =>
              setGeneralSettingsAction("Open source licenses requested")
            }
            onStartHotkeyCapture={() => setGeneralHotkeyCaptureActive(true)}
            value={generalSettings}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {generalSettingsAction}
          </span>
        </>
      ) : workspacePage === "personalization-settings" ? (
        <>
          <PersonalizationSettingsPage
            customInstructionsDirty={
              personalizationSettings.customInstructions !==
              savedCustomInstructions
            }
            data-evidence="runtime-observed"
            learnMoreHref="https://help.openai.com/"
            onChange={setPersonalizationSettings}
            onDeleteLocalMemories={() =>
              setPersonalizationSettingsAction(
                "Delete local memories requested",
              )
            }
            onPersonalityMenuOpenChange={setPersonalizationMenuOpen}
            onSaveCustomInstructions={() => {
              setSavedCustomInstructions(
                personalizationSettings.customInstructions,
              );
              setPersonalizationSettingsAction("Custom instructions saved");
            }}
            personalityMenuOpen={personalizationMenuOpen}
            value={personalizationSettings}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {personalizationSettingsAction}
          </span>
        </>
      ) : workspacePage === "keyboard-shortcuts-settings" ? (
        <>
          <KeyboardShortcutsPage
            captureTarget={keyboardShortcutCaptureTarget}
            clearIcon={<DemoShortcutClearIcon />}
            data-evidence="runtime-observed"
            editIcon={<CurrentBuildIcon name="sidebar-project-menu-edit" />}
            entries={keyboardShortcuts}
            keystrokeSearchIcon={
              <CurrentBuildIcon name="settings-keyboard-shortcuts" />
            }
            onCaptureTargetChange={setKeyboardShortcutCaptureTarget}
            onQueryChange={setKeyboardShortcutQuery}
            onSearchByKeystrokes={() =>
              setKeyboardShortcutAction("Keystroke search requested")
            }
            onShortcutChange={(entry, shortcutIndex, shortcut) => {
              setKeyboardShortcuts((entries) =>
                entries.map((candidate) => {
                  if (candidate.id !== entry.id) return candidate;
                  const shortcuts = [...candidate.shortcuts];
                  shortcuts[shortcutIndex] = shortcut;
                  return { ...candidate, shortcuts };
                }),
              );
              setKeyboardShortcutAction(`${entry.name} shortcut updated`);
            }}
            onShortcutClear={(entry, shortcutIndex) => {
              setKeyboardShortcuts((entries) =>
                entries.map((candidate) =>
                  candidate.id === entry.id
                    ? {
                        ...candidate,
                        shortcuts: candidate.shortcuts.filter(
                          (_, index) => index !== shortcutIndex,
                        ),
                      }
                    : candidate,
                ),
              );
              setKeyboardShortcutAction(`${entry.name} shortcut cleared`);
            }}
            query={keyboardShortcutQuery}
            searchIcon={<CurrentBuildIcon name="settings-search" />}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {keyboardShortcutAction}
          </span>
        </>
      ) : workspacePage === "usage-settings" ? (
        <>
          <UsageSettingsPage
            billingSettingsHref="https://chatgpt.com/#settings"
            cancelPlanContent={
              <p>
                Your subscription is managed through your Apple account.
                You&apos;ll need to{" "}
                <a href="https://support.apple.com/billing">cancel via iOS</a>
              </p>
            }
            credits={{
              balance: "$0",
              giftLabel: "Buy credits for someone else",
              promotionLabel: "Up to 30% off",
            }}
            data-evidence="runtime-observed"
            limitGroups={currentUsageLimitGroups}
            onBuyCredits={() =>
              setUsageSettingsAction("Buy credits checkout requested")
            }
            onGiftCredits={() =>
              setUsageSettingsAction("Gift credits checkout requested")
            }
            onViewPlans={() => {
              setPlanAudience("personal");
              setPlanSelectionAction("");
              setSidebarOpen(false);
              setWorkspacePage("plan-settings");
              setActiveFrame("workspace-plan-settings-personal");
            }}
            plan={{ label: "Pro plan", price: "$100/mo" }}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {usageSettingsAction}
          </span>
        </>
      ) : workspacePage === "voice-settings" ? (
        <>
          <VoiceSettingsPage
            addIcon={<span>+</span>}
            capturingHotkey={voiceCapturingHotkey}
            closeIcon={<CurrentBuildIcon name="review-close" />}
            data-evidence="runtime-observed"
            editIcon={<CurrentBuildIcon name="sidebar-project-menu-edit" />}
            microphoneMenuOpen={voiceMicrophoneMenuOpen}
            microphoneOptions={[
              { id: "system-default", label: "System default" },
              {
                id: "built-in",
                label: "MacBook Pro Microphone (Built-in)",
              },
            ]}
            nextIcon={<CurrentBuildIcon name="window-chrome-forward" />}
            onChange={setVoiceSettings}
            onHotkeyCaptureChange={setVoiceCapturingHotkey}
            onMicrophoneMenuOpenChange={setVoiceMicrophoneMenuOpen}
            onPlayVoicePreview={(voice) =>
              setVoiceSettingsAction(`${voice.label} preview requested`)
            }
            onVoicePickerOpenChange={setVoicePickerOpen}
            previousIcon={<CurrentBuildIcon name="window-chrome-back" />}
            removeIcon={<DemoShortcutClearIcon />}
            value={voiceSettings}
            voicePickerOpen={voicePickerOpen}
          />
          <span aria-live="polite" className="demo-settings-action-status">
            {voiceSettingsAction}
          </span>
        </>
      ) : (
        <GitSettingsPage
          commitInstructionsDirty={
            gitSettings.commitInstructions !== savedCommitInstructions
          }
          onChange={setGitSettings}
          onSaveCommitInstructions={() =>
            setSavedCommitInstructions(gitSettings.commitInstructions)
          }
          onSavePullRequestInstructions={() =>
            setSavedPullRequestInstructions(gitSettings.pullRequestInstructions)
          }
          pullRequestInstructionsDirty={
            gitSettings.pullRequestInstructions !== savedPullRequestInstructions
          }
          value={gitSettings}
        />
      )}
    </SettingsShell>
  );
  const workspacePlanSettingsRoute = (
    <PlanSelectionPage
      audience={planAudience}
      backIcon={<CurrentBuildIcon name="window-chrome-back" />}
      businessCards={currentBusinessPlanCards(
        planMultiplier,
        businessBilling,
      )}
      data-action={planSelectionAction || undefined}
      data-evidence="runtime-observed-host-webview"
      onAudienceChange={(audience) => {
        setPlanAudience(audience);
        setActiveFrame(
          audience === "business"
            ? "workspace-plan-settings-business"
            : "workspace-plan-settings-personal",
        );
      }}
      onBack={() => {
        setSidebarOpen(true);
        setWorkspacePage("conversation");
        setActiveFrame("workspace-ready");
      }}
      onCardAction={(card) =>
        setPlanSelectionAction(`${card.title} plan action requested`)
      }
      onSelectorChange={(card: PlanSelectionCard, value) => {
        if (card.id === "pro" && (value === "5x" || value === "20x")) {
          setPlanMultiplier(value);
        }
        if (
          card.id === "business" &&
          (value === "annual" || value === "monthly")
        ) {
          setBusinessBilling(value);
        }
      }}
      personalCards={currentPersonalPlanCards(planMultiplier)}
    />
  );
  const workspaceRoute =
    workspacePage === "plan-settings"
      ? workspacePlanSettingsRoute
      : workspacePage === "environments"
      ? workspaceEnvironmentSettingsRoute
      : workspacePage === "git-settings" ||
          workspacePage === "hooks-settings" ||
          workspacePage === "code-review-settings" ||
          workspacePage === "appearance-settings" ||
          workspacePage === "general-settings" ||
          workspacePage === "keyboard-shortcuts-settings" ||
          workspacePage === "personalization-settings" ||
          workspacePage === "usage-settings" ||
          workspacePage === "voice-settings" ||
          workspacePage === "worktree-settings"
        ? workspaceSettingsRoute
      : projectIndexChatRoute
        ? projectIndexChatRoute
        : workspacePersistenceFrame
          ? workspacePersistedThread
          : workspaceNewConversationRoute;
  const workspaceShowsSettings =
    workspacePage === "appearance-settings" ||
    workspacePage === "code-review-settings" ||
    workspacePage === "general-settings" ||
    workspacePage === "keyboard-shortcuts-settings" ||
    workspacePage === "personalization-settings" ||
    workspacePage === "plan-settings" ||
    workspacePage === "usage-settings" ||
    workspacePage === "voice-settings" ||
    workspacePage === "git-settings" ||
    workspacePage === "hooks-settings" ||
    workspacePage === "worktree-settings";

  const projectIndexStatus =
    activeFrame === "projects-index-loading"
      ? ("loading" as const)
      : activeFrame === "projects-index-error"
        ? ("error" as const)
        : activeFrame === "projects-index-partial-error"
          ? ("partial-error" as const)
          : ("ready" as const);
  const projectIndexSourceItems = [
    ...createdProjects.map((project, index) => ({
      id: project.id,
      kindLabel: "Local",
      label: project.label,
      path: project.path,
      recentChats: [],
      status: "available" as const,
      updated: "Now",
      updatedOrder: workspaceProjects.length + createdProjects.length - index,
    })),
    ...currentProjectIndexItems,
  ];
  const filteredProjectIndexItems = projectIndexSourceItems
    .filter(({ label, path }) => {
      const query = projectIndexQuery.trim().toLocaleLowerCase();
      return (
        query.length === 0 ||
        label.toLocaleLowerCase().includes(query) ||
        path.toLocaleLowerCase().includes(query)
      );
    })
    .sort((left, right) => {
      const direction = projectIndexSortDirection === "ascending" ? 1 : -1;
      return projectIndexSortBy === "name"
        ? left.label.localeCompare(right.label) * direction
        : (left.updatedOrder - right.updatedOrder) * direction;
    })
    .map((item) => ({
      id: item.id,
      label: item.label,
      status: item.status,
      updated: item.updated,
      actions: (
        <>
          <button
            aria-label={`Project actions for ${item.label}`}
            type="button"
          >
            <SidebarGlyph name="more-current" />
          </button>
          <button aria-label={`Pin ${item.label}`} type="button">
            <SidebarGlyph name="pin-current" />
          </button>
          <button
            aria-label={`Start new chat in ${item.label}`}
            onClick={() => openWorkspace(item.id)}
            type="button"
          >
            <SidebarGlyph name="new" />
          </button>
        </>
      ),
      expanded: expandedProjectIndexIds.has(item.id),
      expandIcon: <SidebarGlyph name="chevron-current" />,
      icon: <SidebarGlyph name="folder-current" />,
      recentChats: item.recentChats.map((chat) => ({
        ...chat,
        actions: (
          <button aria-label={`Chat actions for ${chat.label}`} type="button">
            <SidebarGlyph name="more-current" />
          </button>
        ),
      })),
    }));
  const projectIndexItems =
    projectIndexStatus === "loading" || projectIndexStatus === "error"
      ? []
      : filteredProjectIndexItems;
  const projectIndexDisplayStatus =
    projectCreationStatus === "error" &&
    projectCreationSource === "projects" &&
    projectIndexStatus === "ready"
      ? ("error" as const)
      : projectIndexStatus;
  const projectsRoute = (
    <div className="demo-projects-route">
      <ProjectIndex
        emptyState="No projects"
        items={projectIndexItems}
        label="Projects"
        layout="table"
        onExpandedChange={(projectId, expanded) =>
          setExpandedProjectIndexIds((current) => {
            const next = new Set(current);
            if (expanded) next.add(projectId);
            else next.delete(projectId);
            return next;
          })
        }
        onOpenRecentChat={openProjectIndexChat}
        onSelect={openWorkspace}
        onSortChange={(nextSort) => {
          if (projectIndexSortBy === nextSort) {
            setProjectIndexSortDirection((current) =>
              current === "ascending" ? "descending" : "ascending",
            );
            return;
          }
          setProjectIndexSortBy(nextSort);
          setProjectIndexSortDirection(
            nextSort === "name" ? "ascending" : "descending",
          );
        }}
        sortBy={projectIndexSortBy}
        sortDirection={projectIndexSortDirection}
        sortIcon={<SidebarGlyph name="chevron-current" />}
        status={projectIndexDisplayStatus}
        statusMessage={
          projectCreationStatus === "error" &&
          projectCreationSource === "projects"
            ? "Couldn’t add that project. Try again."
            : projectIndexStatus === "error"
              ? "Couldn’t load projects"
              : projectIndexStatus === "partial-error"
                ? "Some projects may be missing"
                : undefined
        }
        toolbar={
          <div className="demo-projects-search">
            <div className="demo-projects-search__inner">
              <SidebarGlyph name="search" />
              <input
                aria-label="Search projects"
                onChange={(event) =>
                  setProjectIndexQuery(event.currentTarget.value)
                }
                placeholder="Search projects"
                type="search"
                value={projectIndexQuery}
              />
            </div>
          </div>
        }
      />
    </div>
  );

  const reviewableFileChanges = useMemo(
    () =>
      state.fileChanges.filter(
        (fileChange) => !undoneFileIds.has(fileChange.id),
      ),
    [state.fileChanges, undoneFileIds],
  );
  const resolvedReview = resolveReviewSelection(
    reviewableFileChanges,
    reviewSelection,
  );
  const reviewFileChange = resolvedReview?.fileChange;
  const reviewFiles = useMemo(
    () =>
      reviewFileChange?.changes.map((change) => {
        const stats = changeStats(change);
        const content = reviewContent(change);
        return {
          ...change,
          additions: stats.additions,
          change: change.kind,
          content:
            content.kind === "diff"
              ? {
                  kind: "diff" as const,
                  lines:
                    change.kind === "added" ||
                    scenarioId === "current-review-rename" ||
                    scenarioId === "current-review-files" ||
                    scenarioId === "current-review-26-825-files"
                      ? content.lines.filter(({ kind }) => kind !== "hunk")
                      : content.lines,
                }
              : content,
          deletions: stats.deletions,
        };
      }) ?? [],
    [reviewFileChange, scenarioId],
  );
  const reviewTotals = reviewFiles.reduce(
    (totals, file) => ({
      additions: totals.additions + file.additions,
      deletions: totals.deletions + file.deletions,
    }),
    { additions: 0, deletions: 0 },
  );
  const reviewPanel = reviewFileChange ? (
    isCurrentReviewProductReplay ? (
      <WorkspacePanel
        actions={
          <>
            <button
              aria-label="Open side panel tab"
              className="demo-current-review-header-action"
              type="button"
            >
              <CurrentBuildIcon name="review-open-tab" />
            </button>
            <span className="demo-current-review-header-spacer" />
            <button
              aria-label="Expand panel"
              className="demo-current-review-header-action"
              type="button"
            >
              <CurrentBuildIcon name="review-expand" />
            </button>
          </>
        }
        activeTabId="review"
        className="demo-current-review-workspace-panel"
        closeIcon={<CurrentBuildIcon name="review-close" />}
        label="Review"
        onActiveTabChange={() => undefined}
        onCloseTab={() => setReviewOpen(false)}
        placement="side"
        tabCloseButtons
        tabs={[
          {
            content: (
              <FileReviewWorkspace
                data-testid="current-review-workspace"
                defaultCollapsedPaths={
                  isCurrentReview26825FilesReplay
                    ? [
                        "research/current-review-26-825-probe/alpha.txt",
                        "research/current-review-26-825-probe/obsolete.txt",
                      ]
                    : undefined
                }
                files={reviewFiles}
                icons={{
                  collapseAll: <CurrentBuildIcon name="review-collapse-all" />,
                  commit: <CurrentBuildIcon name="review-commit-or-push" />,
                  copyPath: <CurrentBuildIcon name="review-copy-path" />,
                  file: <CurrentBuildIcon name="review-file-text" />,
                  fileToggle: <CurrentBuildIcon name="review-file-toggle" />,
                  filesToggle: <CurrentBuildIcon name="review-files-toggle" />,
                  jumpToFile: <CurrentBuildIcon name="review-jump-file" />,
                  moreGit: <CurrentBuildIcon name="review-more-git" />,
                  openIn: <CurrentBuildIcon name="review-open-in" />,
                  options: <CurrentBuildIcon name="review-options" />,
                  scopeChevron: <CurrentBuildIcon name="review-scope-chevron" />,
                  search: <CurrentBuildIcon name="review-search" />,
                  splitDiff: <CurrentBuildIcon name="review-split-diff" />,
                }}
                onOpenFile={(file) => {
                  setReviewSelectionKey((current) => current + 1);
                  setReviewSelection({
                    fileChangeId: reviewFileChange.id,
                    path: file.path,
                  });
                }}
                rootLabel={
                  isCurrentReview26825FilesReplay
                    ? "research/current-review-26-825-probe"
                    : "codex-ui-kit-review-26-820"
                }
                selectionKey={reviewSelectionKey}
                selectedPath={resolvedReview?.selectedPath}
              />
            ),
            id: "review",
            label: (
              <span className="demo-current-review-tab-label">
                <CurrentBuildIcon name="review-tab" />
                Review
              </span>
            ),
          },
        ]}
      />
    ) : (
      <WorkspacePanel
        activeTabId="review"
        label="Review"
        onActiveTabChange={() => undefined}
        onClose={() => setReviewOpen(false)}
        onCloseTab={() => setReviewOpen(false)}
        placement="side"
        tabs={[
          {
            content: (
              <div className="demo-review-panel" data-testid="review-panel">
                <div className="demo-review-panel__toolbar">
                  <div>
                    <strong>
                      {scenarioId === "current-review-rename"
                        ? "Last Turn"
                        : "Last turn"}
                    </strong>
                    {scenarioId === "current-review-rename" ? (
                      <span aria-hidden="true">⌄</span>
                    ) : (
                      <span>
                        {reviewFiles.length}{" "}
                        {reviewFiles.length === 1 ? "file" : "files"}
                      </span>
                    )}
                  </div>
                  <span className="demo-review-panel__stats">
                    <span data-stat="additions">
                      +{reviewTotals.additions}
                    </span>{" "}
                    <span data-stat="deletions">
                      {scenarioId === "current-review-rename" ? "-" : "−"}
                      {reviewTotals.deletions}
                    </span>
                  </span>
                </div>
                <FileReview
                  aria-label="Last turn file review"
                  files={reviewFiles}
                  onSelectFile={(file) => {
                    setReviewSelectionKey((current) => current + 1);
                    setReviewSelection({
                      fileChangeId: reviewFileChange.id,
                      path: file.path,
                    });
                  }}
                  selectionKey={reviewSelectionKey}
                  selectedPath={resolvedReview?.selectedPath}
                />
              </div>
            ),
            id: "review",
            label: "Review",
          },
        ]}
      />
    )
  ) : null;
  const browserWorkspacePanel = isCurrentBrowser26825Replay ? (
    <BrowserWorkspacePanel
      className="demo-current-browser-workspace"
      data-testid="current-browser-workspace"
      onCloseTab={() => setBrowserPanelOpen(false)}
      tabs={[
        {
          active: true,
          id: "codex-page",
          title: (
            <span className="demo-current-browser-workspace__tab-label">
              <span aria-hidden="true">◉</span>
              <span>
                Codex in ChatGPT | AI Coding Agents for Software Engineering |
                OpenAI
              </span>
            </span>
          ),
        },
      ]}
    >
      <div
        className="demo-current-browser-workspace__page"
        data-source-owned="external-web-content"
      >
        <strong>External page content</strong>
        <span>https://openai.com/codex/</span>
      </div>
    </BrowserWorkspacePanel>
  ) : null;
  const citationSourcesPanel = isCurrentCitations26825Replay ? (
    <WorkspacePanel
      actions={
        <>
          <button
            aria-label="Open side panel tab"
            className="demo-current-citations-sources__action"
            type="button"
          >
            +
          </button>
          <span className="demo-current-citations-sources__spacer" />
          <button
            aria-label="Expand Sources panel"
            className="demo-current-citations-sources__action"
            type="button"
          >
            <CurrentBuildIcon name="review-expand" />
          </button>
          <button
            aria-label="Open Sources in bottom panel"
            className="demo-current-citations-sources__action"
            type="button"
          >
            <CurrentBuildIcon name="thread-header-bottom-panel" />
          </button>
          <button
            aria-label="Toggle Sources side panel"
            className="demo-current-citations-sources__action"
            onClick={() => setCitationSourcesOpen(false)}
            type="button"
          >
            <CurrentBuildIcon name="thread-header-side-panel" />
          </button>
        </>
      }
      activeTabId="sources"
      className="demo-current-citations-sources"
      data-testid="current-citations-sources"
      label="Sources"
      onActiveTabChange={() => undefined}
      onCloseTab={() => setCitationSourcesOpen(false)}
      placement="side"
      tabCloseButtons
      tabs={[
        {
          closeLabel: "Close Sources tab",
          content: (
            <SourceActivityList>
              <SourceSearchActivity
                expanded={citationSearchExpanded}
                leading={<SummaryGlyph name="globe" />}
                onExpandedChange={setCitationSearchExpanded}
                queries={currentCitationQueries}
              />
            </SourceActivityList>
          ),
          id: "sources",
          label: (
            <span className="demo-current-citations-sources__tab-label">
              <SummaryGlyph name="link" />
              <span>Sources</span>
            </span>
          ),
        },
      ]}
    />
  ) : null;
  const subagentPanel = hasSubagentSurface ? (
    <WorkspacePanel
      activeTabId="subagents"
      actions={
        <>
          <button
            aria-label="Open side panel tab"
            className="demo-subagent-panel-header-action"
            type="button"
          >
            +
          </button>
          <span className="demo-subagent-panel-header-spacer" />
          <button
            aria-label="Expand side panel"
            className="demo-subagent-panel-header-action"
            type="button"
          >
            ⌜
          </button>
          <button
            aria-label="Toggle bottom panel"
            className="demo-subagent-panel-header-action"
            type="button"
          >
            ▱
          </button>
          <button
            aria-label="Toggle side panel"
            className="demo-subagent-panel-header-action"
            onClick={() => setSubagentPanelOpen(false)}
            type="button"
          >
            ▯
          </button>
        </>
      }
      className="demo-subagent-workspace-panel"
      label="Subagents"
      onActiveTabChange={() => undefined}
      onCloseTab={() => setSubagentPanelOpen(false)}
      placement="side"
      tabCloseButtons
      tabs={[
        {
          closeLabel: "Close Subagents tab",
          content: selectedSubagent ? (
            <div
              className="demo-subagent-transcript"
              data-testid="subagent-transcript"
            >
              <SubagentTranscriptHeader
                item={selectedSubagent}
                onBack={() => setSelectedSubagentId(null)}
              />
              <AgentMessage
                actions={
                  <McpResponseActions
                    includeFork={false}
                    label="Subagent response actions"
                  />
                }
                role="assistant"
              >
                {selectedSubagent.lastMessage ?? "Working"}
              </AgentMessage>
            </div>
          ) : (
            <SubagentPanel
              activeTitle={`Active · ${activeSubagentCount}`}
              data-testid="subagent-panel"
              items={subagentItems}
              onSelect={(item) => setSelectedSubagentId(item.id)}
            />
          ),
          id: "subagents",
          label: (
            <span className="demo-subagent-panel-tab-label">
              <SubagentAvatar seed="long-probe" size="tiny" />
              <span>Subagents</span>
            </span>
          ),
        },
      ]}
      tabsLabel="Subagent tabs"
    />
  ) : null;
  const pullRequestChecks = [
    {
      id: "electron",
      name: "Codex app Electron acceptance",
      status:
        pullRequestState.checkStatus === "passed"
          ? ("passed" as const)
          : pullRequestState.checkStatus === "failed"
            ? ("failed" as const)
            : ("running" as const),
    },
    {
      id: "check",
      name: "check",
      status:
        pullRequestState.checkStatus === "failed"
          ? ("failed" as const)
          : pullRequestState.checkStatus === "running"
            ? ("running" as const)
            : ("passed" as const),
    },
    { id: "codeql", name: "CodeQL", status: "passed" as const },
    {
      id: "react-nodenext",
      name: "React 19 / NodeNext consumer",
      status: "passed" as const,
    },
  ];
  const pullRequestMergeAction =
    pullRequestState.checkStatus === "failed" ? (
      <button
        onClick={() =>
          schedulePullRequestTransition(
            { type: "checks/run" },
            { type: "checks/pass" },
          )
        }
        type="button"
      >
        Re-run checks
      </button>
    ) : pullRequestState.reviewRequirement !== "passed" &&
      pullRequestState.mergeStatus !== "checking" ? (
      <button
        onClick={() => {
          setPullRequestTab("code");
          setPullRequestReviewOpen(true);
        }}
        type="button"
      >
        Open review
      </button>
    ) : undefined;
  const showPullRequestLifecycleDetails =
    activeFrame === "pr-checks-running" ||
    activeFrame === "pr-checks-failed" ||
    activeFrame === "pr-merge-blocked" ||
    activeFrame === "pr-merge-ready" ||
    activeFrame === "pr-merged";
  const pullRequestTimeline = (
    <div aria-label="Pull request timeline" className="demo-pr-panel__timeline">
      <article>
        <span aria-hidden="true" className="demo-pr-avatar">
          J
        </span>
        <div>
          <strong>JaminZhou opened this pull request</strong>
          <time dateTime="PT2H">2h</time>
        </div>
      </article>
      <article>
        <span aria-hidden="true" className="demo-pr-avatar">
          C
        </span>
        <div>
          <strong>chatgpt-codex-connector reviewed the latest push</strong>
          <time dateTime="PT1H">1h</time>
        </div>
      </article>
    </div>
  );
  const currentPullRequestChecks = [
    {
      id: "check",
      name: "check",
      status: "running" as const,
      statusLabel: "In progress",
    },
    {
      id: "electron",
      name: "Codex app Electron acceptance",
      status: "running" as const,
      statusLabel: "In progress",
    },
    {
      id: "javascript",
      name: "Analyze JavaScript and TypeScript",
      status: "passed" as const,
    },
    {
      id: "react-18",
      name: "React 18 / Bundler consumer",
      status: "passed" as const,
    },
    {
      id: "react-19",
      name: "React 19 / Bundler consumer",
      status: "passed" as const,
    },
    {
      id: "react-nodenext",
      name: "React 19 / NodeNext consumer",
      status: "passed" as const,
    },
    { id: "codeql", name: "CodeQL", status: "passed" as const },
  ];
  const currentPullRequestTimeline = (
    <section
      aria-label="Pull request activity"
      className="demo-current-pr-activity"
    >
      <header>
        <h2>
          Activity <span aria-hidden="true">⌄</span>
        </h2>
        <span>2</span>
      </header>
      <article>
        <span aria-hidden="true" className="demo-current-pr-activity__icon">
          ◎
        </span>
        <div>
          <strong>chore: open current pull request fixture</strong>
          <span>
            <code>679ff2a</code> · 1m
          </span>
        </div>
      </article>
      <article>
        <span aria-hidden="true" className="demo-current-pr-activity__icon">
          <CurrentPullRequestIcon name="status" />
        </span>
        <div>
          <strong>JaminZhou opened this pull request</strong>
          <span>1m</span>
        </div>
      </article>
    </section>
  );
  const currentPullRequestSummaryReady = (
    <PullRequestPanelSummary
      checks={
        <PullRequestCheckList
          checks={currentPullRequestChecks}
          className="demo-current-pr-checks"
        />
      }
      className="demo-pr-panel__summary demo-current-pr-summary"
      commentComposer={
        <PullRequestCommentComposer
          aria-label="Pull request comment composer"
          value=""
        />
      }
      commentPlacement="after-timeline"
      description={
        <div className="demo-pr-description demo-current-pr-description">
          <h3>Scope</h3>
          <ul>
            <li>use this open PR as a read-only current-build fixture</li>
            <li>
              refresh the current Pull request detail, Timeline, and Code
              workspace contracts
            </li>
            <li>
              add CDP, Electron, reviewed pixel, and local-only product-region
              gates
            </li>
          </ul>
          <p>
            Implementation and final local verification will be pushed to this
            same PR before direct squash merge.
          </p>
        </div>
      }
      descriptionAction={
        <button aria-label="Description actions" type="button">
          <CurrentPullRequestIcon name="edit" />
        </button>
      }
      descriptionHeading={
        <>
          Description <span aria-hidden="true">⌄</span>
        </>
      }
      facts={[
        {
          id: "branch",
          indicator: <CurrentPullRequestIcon name="branch" />,
          label: "Branch",
          value: (
            <span className="demo-pr-branch demo-current-pr-branch">
              <span>feat/current-pull-request-review</span>
              <span aria-hidden="true">›</span>
              <span>main</span>
              <button aria-label="Review pull request changes" type="button">
                <span className="demo-pr-additions">+0</span>
                <span className="demo-pr-deletions">−0</span>
              </button>
            </span>
          ),
        },
        {
          id: "reviewers",
          indicator: <CurrentPullRequestIcon name="reviewers" />,
          label: "Reviewers",
          value: (
            <button aria-label="Request reviewers" type="button">
              <CurrentPullRequestIcon name="plus" />
              Request
            </button>
          ),
        },
        {
          id: "comments",
          indicator: <CurrentPullRequestIcon name="comments" />,
          label: "Comments",
          value: "No comments",
        },
        {
          id: "checks",
          indicator: <CurrentPullRequestIcon name="checks" />,
          label: "Checks",
          tone: "warning" as const,
          value: "Pending",
        },
        {
          id: "status",
          indicator: <CurrentPullRequestIcon name="status" />,
          label: "Status",
          value: (
            <button aria-label="Change pull request status" type="button">
              Ready for review <span aria-hidden="true">⌄</span>
            </button>
          ),
        },
      ]}
      meta={
        <>
          <span className="demo-pr-avatar demo-pr-avatar--small">J</span>
          <span>JaminZhou</span>
          <span>·</span>
          <span>1m</span>
        </>
      }
      timeline={currentPullRequestTimeline}
      title="feat: refresh current pull request review"
      titleAction={
        <button aria-label="Edit title" type="button">
          <CurrentPullRequestIcon name="edit" />
        </button>
      }
    />
  );
  const pullRequestSummaryReady = (
    <PullRequestPanelSummary
      checks={
        showPullRequestLifecycleDetails ? (
          <div className="demo-pr-checks">
            <PullRequestCheckList checks={pullRequestChecks} />
            <PullRequestMergeReadiness
              action={pullRequestMergeAction}
              description={
                pullRequestState.mergeStatus === "blocked"
                  ? "All current-head gates must pass before merging."
                  : pullRequestState.mergeStatus === "ready"
                    ? "Current-head checks, review, and threads are clean."
                    : undefined
              }
              requirements={[
                {
                  description:
                    pullRequestState.checkStatus === "passed"
                      ? "7 checks successful"
                      : pullRequestState.checkStatus === "running"
                        ? "Current-head checks are running"
                        : "A current-head check failed",
                  id: "checks",
                  label: "Checks",
                  status:
                    pullRequestState.checkStatus === "passed"
                      ? "passed"
                      : pullRequestState.checkStatus === "failed"
                        ? "failed"
                        : "pending",
                },
                {
                  description:
                    pullRequestState.reviewRequirement === "passed"
                      ? "Fresh review after the latest push"
                      : pullRequestState.reviewRequirement === "failed"
                        ? "Review submission failed"
                        : "Waiting for a fresh current-head review",
                  id: "review",
                  label: "Review",
                  status: pullRequestState.reviewRequirement,
                },
                {
                  description: "No unresolved bot threads",
                  id: "threads",
                  label: "Review threads",
                  status: "passed",
                },
              ]}
              status={pullRequestState.mergeStatus}
            />
          </div>
        ) : undefined
      }
      className="demo-pr-panel__summary"
      commentComposer={
        <PullRequestCommentComposer
          error={pullRequestState.commentError}
          onSubmit={() =>
            schedulePullRequestTransition(
              { type: "comment/submit" },
              { type: "comment/succeed" },
            )
          }
          onValueChange={(body) =>
            dispatchPullRequest({ body, type: "comment/change" })
          }
          status={pullRequestState.commentStatus}
          value={pullRequestState.commentBody}
        />
      }
      description={
        <div className="demo-pr-description">
          <h3>Summary</h3>
          <ul>
            <li>
              add controlled multi-session TerminalPanel tabs, per-tab close,
              restore hooks, and TerminalProcessList
            </li>
            <li>
              add a 15-event terminal lifecycle replay with running, failed,
              exited, picker, close/restore, and compact states
            </li>
            <li>
              gate 49 lifecycle scenes through CDP, real Electron interactions,
              and reviewed pixels
            </li>
            <li>
              refresh current-build terminal evidence and split session UI from
              process lifecycle <span className="demo-pr-final-word">claims</span>
            </li>
          </ul>
          <h3>Verification</h3>
          <ul>
            <li>pnpm check</li>
            <li>pnpm check:codex-app:acceptance</li>
            <li>
              pnpm --filter @codex-ui-kit/codex-app-playground typecheck
            </li>
            <li>pnpm --filter @codex-ui-kit/codex-app-playground test</li>
          </ul>
        </div>
      }
      descriptionAction={
        <button aria-label="Edit description" type="button">
          ✎
        </button>
      }
      descriptionHeading={
        <>
          Description <span aria-hidden="true">⌄</span>
        </>
      }
      facts={[
        {
          id: "branch",
          indicator: "⑂",
          label: "Branch",
          value: (
            <span className="demo-pr-branch">
              <span>feat/terminal-sessi…</span>
              <span aria-hidden="true">›</span>
              <span>m…</span>
              <span className="demo-pr-additions">+1,743</span>
              <span className="demo-pr-deletions">−231</span>
            </span>
          ),
        },
        {
          id: "reviewers",
          indicator: "◎",
          label: "Reviewers",
          value: (
            <span className="demo-pr-reviewers">
              <span aria-hidden="true" className="demo-pr-reviewer-status" />
              <button aria-label="Request reviewers" type="button">
                +
              </button>
            </span>
          ),
        },
        {
          id: "comments",
          indicator: "◌",
          label: "Comments",
          value: "17 comments",
        },
        {
          id: "checks",
          indicator: "○",
          label: "Checks",
          tone:
            pullRequestState.checkStatus === "passed"
              ? "success"
              : pullRequestState.checkStatus === "failed"
                ? "danger"
                : undefined,
          value:
            pullRequestState.checkStatus === "passed"
              ? "Successful"
              : pullRequestState.checkStatus === "failed"
                ? "Failed"
                : "In progress",
        },
        {
          id: "status",
          indicator: "⑂",
          label: "Status",
          value: "Ready for review⌄",
        },
      ]}
      meta={
        <>
          <span className="demo-pr-avatar demo-pr-avatar--small">J</span>
          <span>JaminZhou</span>
          <span>·</span>
          <span>2h</span>
        </>
      }
      timeline={pullRequestTimeline}
      title="feat: add terminal session lifecycle"
      titleAction={
        <button aria-label="Edit title" type="button">
          ✎
        </button>
      }
    />
  );
  const pullRequestDetailState =
    pullRequestState.detailStatus === "ready" ? null : (
      <PullRequestQueryState
        action={
          pullRequestState.detailStatus === "error" ? (
            <button
              onClick={() =>
                schedulePullRequestTransition(
                  { type: "detail/load" },
                  { type: "detail/ready" },
                )
              }
              type="button"
            >
              Retry
            </button>
          ) : undefined
        }
        description={
          pullRequestState.detailStatus === "error"
            ? "The pull request detail could not be loaded."
            : "Fetching the latest summary and diff."
        }
        heading={
          pullRequestState.detailStatus === "error"
            ? "Pull request unavailable"
            : pullRequestState.detailStatus === "empty"
              ? "Pull request not found"
              : "Loading pull request"
        }
        status={pullRequestState.detailStatus}
      />
    );
  const pullRequestSummary =
    pullRequestDetailState ??
    (isCurrentPullRequestReviewReplay
      ? currentPullRequestSummaryReady
      : pullRequestSummaryReady);
  const currentPullRequestCodeFiles = [
    {
      additions: 18,
      deletions: 0,
      path: "playgrounds/codex-app/scripts/electron-harness.mjs",
    },
    {
      additions: 442,
      deletions: 57,
      path: "playgrounds/codex-app/src/App.tsx",
    },
    {
      additions: 8,
      deletions: 0,
      path: "playgrounds/codex-app/src/pull-request-lifecycle.ts",
    },
    {
      additions: 576,
      deletions: 0,
      path: "playgrounds/codex-app/src/styles.css",
    },
    {
      additions: 0,
      deletions: 0,
      path: "playgrounds/codex-app/tests/visual/baselines/pr-detail-current-26-825-summary-expanded.png",
      preview: currentPullRequestSummaryExpandedPreview,
    },
    {
      additions: 0,
      deletions: 0,
      path: "playgrounds/codex-app/tests/visual/baselines/pr-detail-current-26-825-summary.png",
      preview: currentPullRequestSummaryPreview,
    },
    {
      additions: 9,
      deletions: 1,
      path: "src/components/AppShell.tsx",
    },
    {
      additions: 26,
      deletions: 13,
      path: "src/components/PullRequestSurfaces.tsx",
    },
    {
      additions: 20,
      deletions: 0,
      path: "tests/workflow-surfaces.test.tsx",
    },
  ];
  const currentPullRequestCode = (
    <div className="demo-current-pr-code">
      <div aria-label="Code review controls" className="demo-current-pr-code__toolbar">
        <button aria-label="Review options" type="button">
          <CurrentBuildIcon name="review-options" />
        </button>
        <button aria-label="Collapse all diffs" type="button">
          <CurrentBuildIcon name="review-collapse-all" />
        </button>
        <button aria-label="Switch to split diff" type="button">
          <CurrentBuildIcon name="review-split-diff" />
        </button>
        <button aria-label="Show file tree" type="button">
          <CurrentBuildIcon name="review-files-toggle" />
        </button>
      </div>
      <ol aria-label="Pull request code review" className="demo-current-pr-code__files">
        {currentPullRequestCodeFiles.map((file) => (
          <li key={file.path}>
            <button
              aria-expanded={Boolean(file.preview)}
              aria-label={file.path}
              type="button"
            >
              <span className="demo-current-pr-code__path">{file.path}</span>
              <span className="demo-current-pr-code__stats">
                <span className="demo-pr-additions">+{file.additions}</span>
                <span className="demo-pr-deletions">-{file.deletions}</span>
              </span>
              <span aria-hidden="true" className="demo-current-pr-code__open-slot" />
              <span aria-hidden="true" className="demo-current-pr-code__chevron">
                <CurrentBuildIcon name="review-file-toggle" />
              </span>
            </button>
            {file.preview ? (
              <div className="demo-current-pr-code__preview">
                <img alt="" src={file.preview} />
              </div>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
  const legacyPullRequestCode = (
    <div
      className="demo-pr-panel__code"
      data-review-open={pullRequestReviewOpen || undefined}
    >
      <div aria-label="Code review controls" className="demo-pr-code-toolbar">
        <button
          aria-expanded={pullRequestReviewMenuOpen}
          aria-haspopup="menu"
          aria-label="Review options"
          onClick={() => setPullRequestReviewMenuOpen((open) => !open)}
          type="button"
        >
          ⋯
        </button>
        <button aria-label="Collapse all diffs" type="button">
          −
        </button>
        <button aria-label="Switch to split diff" type="button">
          ◫
        </button>
        <button aria-label="Show file tree" type="button">
          ☷
        </button>
        {pullRequestReviewMenuOpen ? (
          <div
            aria-label="Review options"
            className="demo-pr-review-menu"
            role="menu"
          >
            <button role="menuitem" type="button">
              Enable word wrap
            </button>
            <button role="menuitem" type="button">
              Enable rich preview
            </button>
            <button role="menuitem" type="button">
              Enable word diffs
            </button>
            <button
              onClick={() => {
                setPullRequestReviewMenuOpen(false);
                setPullRequestReviewOpen(true);
              }}
              role="menuitem"
              type="button"
            >
              Open synthetic review
            </button>
          </div>
        ) : null}
      </div>
      {pullRequestReviewOpen ? (
        <PullRequestReviewComposer
          body={pullRequestState.reviewBody}
          error={pullRequestState.reviewError}
          kind={pullRequestState.reviewKind}
          onBodyChange={(body) =>
            dispatchPullRequest({ body, type: "review/body" })
          }
          onKindChange={(kind) =>
            dispatchPullRequest({ kind, type: "review/kind" })
          }
          onSubmit={() =>
            schedulePullRequestTransition(
              { type: "review/submit" },
              { type: "review/succeed" },
            )
          }
          status={pullRequestState.reviewStatus}
        />
      ) : null}
      <FileReview
        aria-label="Pull request code review"
        files={pullRequestFiles}
        selectedPath={pullRequestFiles[0].path}
      />
    </div>
  );
  const pullRequestCode = isCurrentPullRequestReviewReplay
    ? currentPullRequestCode
    : legacyPullRequestCode;
  const pullRequestPanel = (
    <WorkspacePanel
      actions={
        isCurrentPullRequestReviewReplay ? (
          <>
            <button aria-label="Open in browser" type="button">
              <CurrentBuildIcon name="review-open-in" />
            </button>
            <button type="button">Open chat</button>
            <button type="button">
              <CurrentPullRequestIcon name="merge" />
              Merge
              <span aria-hidden="true">⌄</span>
            </button>
          </>
        ) : (
          <>
            <button aria-label="Open in browser" type="button">
              ↗
            </button>
            <button type="button">Auto-merge</button>
            <button
              disabled={pullRequestState.mergeStatus !== "ready"}
              onClick={() =>
                schedulePullRequestTransition(
                  { type: "merge/start" },
                  { type: "merge/succeed" },
                )
              }
              type="button"
            >
              {pullRequestState.mergeStatus === "merged"
                ? "Merged"
                : pullRequestState.mergeStatus === "merging"
                  ? "Merging…"
                  : "Merge"}
            </button>
          </>
        )
      }
      activeTabId={pullRequestTab}
      className={
        isCurrentPullRequestReviewReplay
          ? "demo-pr-panel demo-current-pr-panel"
          : "demo-pr-panel"
      }
      data-testid="pull-request-panel"
      expandIcon={
        isCurrentPullRequestReviewReplay ? (
          <CurrentBuildIcon name="review-expand" />
        ) : undefined
      }
      expanded={pullRequestExpanded}
      label="Pull request"
      onActiveTabChange={(id) =>
        setPullRequestTab(id as typeof pullRequestTab)
      }
      onExpandedChange={setPullRequestExpanded}
      placement="side"
      restoreIcon={
        isCurrentPullRequestReviewReplay ? (
          <CurrentPullRequestIcon name="restore" />
        ) : undefined
      }
      restorePanelLabel="Restore panel width"
      tabs={[
        { content: pullRequestSummary, id: "summary", label: "Summary" },
        {
          content: pullRequestDetailState ?? pullRequestCode,
          id: "code",
          label: "Code",
        },
      ]}
      tabsLabel="Pull request view"
    />
  );
  const currentPullRequestEmptyPanel = (
    <div
      className="demo-current-pr-empty-panel"
      data-testid="current-pull-request-empty-panel"
    >
      Select pull request to view
    </div>
  );
  const pullRequestIndex = (
    <section
      aria-label="Pull requests"
      className={[
        "demo-pr-index",
        isCurrentPullRequestRouteReplay
          ? "demo-current-pr-index"
          : undefined,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        aria-expanded={sidebarOpen}
        aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        className="demo-pr-sidebar-toggle"
        onClick={() => setSidebarOpen((open) => !open)}
        type="button"
      >
        <SidebarGlyph name="sidebar" />
      </button>
      <header>
        {isCurrentPullRequestRouteReplay &&
        pullRequestState.indexStatus === "loading" ? (
          <h1>Pull requests</h1>
        ) : (
          <div role="tablist" aria-label="Pull request filters">
            <button aria-selected="true" role="tab" type="button">
              All
            </button>
            <button aria-selected="false" role="tab" type="button">
              Reviewing
            </button>
            <button aria-selected="false" role="tab" type="button">
              Authored
            </button>
          </div>
        )}
      </header>
      {!isCurrentPullRequestRouteReplay ||
      pullRequestState.indexStatus !== "loading" ? (
        <div className="demo-pr-index__search">
          {isCurrentPullRequestRouteReplay ? (
            <span aria-hidden="true" className="demo-current-pr-search-icon">
              <CurrentPullRequestRouteIcon name="search" />
            </span>
          ) : null}
          <input
            aria-label="Search pull requests"
            defaultValue={
              isCurrentPullRequestReviewReplay
                ? "228"
                : isCurrentPullRequestRouteReplay
                  ? undefined
                  : "80"
            }
            placeholder="Search pull requests"
            type="search"
          />
          <button aria-label="Filter pull requests" type="button">
            {isCurrentPullRequestRouteReplay ? (
              <CurrentPullRequestRouteIcon name="filter" />
            ) : (
              "≡"
            )}
          </button>
        </div>
      ) : null}
      {isCurrentPullRequestRouteReplay ? (
        isCurrentPullRequestReviewReplay ? <h2>Authored⌄</h2> : null
      ) : (
        <h2>Authored</h2>
      )}
      {pullRequestState.indexStatus === "ready" ? (
        <PullRequestList
          items={
            isCurrentPullRequestReviewReplay
              ? [
                  {
                    author: "JaminZhou",
                    checkStatus: "running" as const,
                    id: "228",
                    indicator: (
                      <span className="demo-current-pr-list-indicator">
                        <CurrentPullRequestIcon name="status" />
                        <i />
                      </span>
                    ),
                    meta: (
                      <>
                        <span>JaminZhou/codex-ui-kit</span>
                        <span>feat/current-pull-request-review</span>
                        <span>
                          <span className="demo-pr-additions">+0</span>{" "}
                          <span className="demo-pr-deletions">−0</span>
                        </span>
                      </>
                    ),
                    number: 228,
                    openLabel: "feat: refresh current pull request review",
                    repository: "codex-ui-kit",
                    state: "open" as const,
                    title: (
                      <>
                        <span>feat: refresh current pull request review</span>
                        <time dateTime="PT1M">1m</time>
                      </>
                    ),
                    updatedAt: "1m",
                  },
                ]
              : [
                  {
                    author: "JaminZhou",
                    checkStatus:
                      pullRequestState.checkStatus === "passed"
                        ? ("passed" as const)
                        : pullRequestState.checkStatus === "failed"
                          ? ("failed" as const)
                          : ("running" as const),
                    commentCount: 6,
                    id: "80",
                    indicator: (
                      <span className="demo-pr-branch-indicator">
                        ⑂<i />
                      </span>
                    ),
                    number: 80,
                    repository: "codex-ui-kit",
                    state: "open" as const,
                    title: "feat: add terminal session lifecycle",
                    updatedAt: "now",
                  },
                ]
          }
          onSelect={(id) => {
            dispatchPullRequest({ id, type: "select" });
            setPullRequestOpen(true);
            schedulePullRequestTransition(
              { type: "detail/load" },
              { type: "detail/ready" },
            );
          }}
          selectedId={
            pullRequestOpen
              ? (pullRequestState.selectedId ?? undefined)
              : undefined
          }
        />
      ) : (
        <PullRequestQueryState
          action={
            !isCurrentPullRequestRouteReplay &&
            (pullRequestState.indexStatus === "error" ||
              pullRequestState.indexStatus === "empty") ? (
              <button
                onClick={() =>
                  schedulePullRequestTransition(
                    { type: "index/load" },
                    { type: "index/ready" },
                  )
                }
                type="button"
              >
                {pullRequestState.indexStatus === "empty"
                  ? "Refresh"
                  : "Retry"}
              </button>
            ) : undefined
          }
          description={
            isCurrentPullRequestRouteReplay
              ? undefined
              : pullRequestState.indexStatus === "error"
              ? "Check the connection and try again."
              : pullRequestState.indexStatus === "empty"
                ? "No pull requests match the current filters."
                : undefined
          }
          heading={
            isCurrentPullRequestRouteReplay &&
            pullRequestState.indexStatus === "empty"
              ? "No pull requests found"
              : undefined
          }
          status={pullRequestState.indexStatus}
          variant={
            isCurrentPullRequestRouteReplay ? "split-list" : "list"
          }
        />
      )}
    </section>
  );
  const shellRouteContent = (
    <div className="demo-shell-route-content">
      <header>
        <div>
          <span className="demo-shell-route-eyebrow">Workspace</span>
          <h1>Pull requests</h1>
        </div>
        <button type="button">New pull request</button>
      </header>
      <div className="demo-shell-route-toolbar">
        <input
          aria-label="Search restored pull requests"
          placeholder="Search pull requests"
          type="search"
        />
        <button type="button">All repositories</button>
      </div>
      <article>
        <span aria-hidden="true" className="demo-shell-route-status">✓</span>
        <div>
          <strong>App shell continuity</strong>
          <span>codex-ui-kit · ready for review</span>
        </div>
        <time dateTime="PT2M">2m</time>
      </article>
    </div>
  );
  const shellRoute = (
    <AppRouteOutlet
      actions={
        shellState === "offline" || shellState === "error"
          ? [
              {
                label: "Try again",
                onClick: () => {
                  setShellState("loading");
                  window.setTimeout(() => {
                    setShellState("ready");
                    setShellNotificationVisible(true);
                  }, 240);
                },
                primary: true,
              },
            ]
          : []
      }
      aria-label="Pull requests route"
      description={
        shellState === "loading"
          ? "Refreshing pull requests…"
          : undefined
      }
      heading={
        shellState === "loading" ? "Loading pull requests" : undefined
      }
      status={shellState}
    >
      {shellRouteContent}
    </AppRouteOutlet>
  );
  const messageNavigationItems = currentWindowedFrame
    ? Array.from({ length: windowedHistorySize }, (_, index) => ({
        id: `current-windowed-user-${index + 1}`,
        label: current26825LongFrame
          ? `LONG THREAD ${String(index + 1).padStart(2, "0")}`
          : `Synthetic user checkpoint ${index + 1}`,
      }))
    : state.messages
        .filter(({ role }) => role === "user")
        .map((message) => ({
          id: message.id,
          label: message.text,
        }));
  const currentWindowStart =
    current26825LongFrame &&
    activeFrame === "thread-current-26-825-middle" &&
    windowedSelectedMessageIndex === current26825LongMiddleIndex
      ? 5
      : current26825LongFrame &&
          activeFrame === "thread-current-26-825-compact-away" &&
          windowedSelectedMessageIndex === current26825LongCompactIndex
        ? 18
        : Math.min(
            windowedHistorySize - windowedTurnWindowSize,
            Math.max(
              0,
              windowedSelectedMessageIndex -
                Math.floor(windowedTurnWindowSize / 2),
            ),
          );
  const currentWindowEnd =
    currentWindowStart + windowedTurnWindowSize;
  const windowedPlaceholderRem = current26825LongFrame
    ? activeFrame === "thread-current-26-825-compact-away"
      ? 10.5532
      : 9.2637
    : 42;
  const timelineContent = state.timeline.map((entry, entryIndex) => {
    if (entry.kind === "streamError") {
      const streamError = state.streamErrors.find(({ id }) => id === entry.id);
      if (!streamError) return null;
      const isCurrentNetworkWait =
        isCurrentNetworkTransportRecoveryReplay &&
        streamError.content === "Reconnecting... waiting for network";
      return (
        <StreamNotice
          additionalDetails={streamError.additionalDetails}
          className={
            isCurrentNetworkWait
              ? "codex-ui-stream-notice--current-network-wait"
              : undefined
          }
          data-item-id={streamError.id}
          icon={
            isCurrentTransportRecoveryReplay ? (
              <CurrentBuildIcon name="thread-reconnecting" />
            ) : undefined
          }
          key={`stream-error:${streamError.id}`}
          reconnectAttempt={streamError.reconnectAttempt ?? undefined}
          reconnectMaxAttempts={
            streamError.reconnectMaxAttempts ?? undefined
          }
          serverBusy={streamError.serverBusy}
        >
          {streamError.reconnectAttempt === null ? (
            isCurrentNetworkWait ? (
              <span className="codex-ui-current-network-wait-label">
                {streamError.content}
              </span>
            ) : (
              streamError.content
            )
          ) : undefined}
        </StreamNotice>
      );
    }
    if (entry.kind === "systemError") {
      const systemError = state.systemErrors.find(({ id }) => id === entry.id);
      if (!systemError) return null;
      return (
        <SystemErrorNotice
          data-item-id={systemError.id}
          key={`system-error:${systemError.id}`}
        >
          {systemError.content}
        </SystemErrorNotice>
      );
    }
    if (entry.kind === "automaticApprovalReview") {
      const review = state.automaticApprovalReviews.find(
        ({ id }) => id === entry.id,
      );
      if (!review || review.status === "approved") return null;
      return (
        <AutomaticApprovalReview
          action={review.actionLabel}
          data-item-id={review.id}
          data-testid="automatic-approval-review"
          key={`automatic-approval-review:${review.id}`}
          rationale={review.rationale}
          riskLevel={review.riskLevel}
          status={review.status}
        />
      );
    }
    if (entry.kind === "message") {
      const message = state.messages.find(({ id }) => id === entry.id);
      if (!message) return null;
      const submittedMessageAttachments =
        isCurrentAttachmentReplay &&
        message.role === "user" &&
        message.id === "user-attachment-lifecycle" &&
        submittedComposerAttachments.length > 0
          ? submittedComposerAttachments
          : null;
      const submittedMessageText = submittedMessageAttachments
        ? (submittedComposerPrompt ?? message.text)
        : message.text;
      const groupedMcpIntro =
        ((scenarioId === "mcp-recovery-mixed-thread" &&
          (message.id === "assistant-recovery-intro" ||
            message.id === "assistant-recovery-status")) ||
          (scenarioId === "mcp-tool-call" &&
            message.id === "assistant-mcp-intro") ||
          (scenarioId === "mcp-current-integration-recovery" &&
            message.id ===
              "assistant-current-integration-recovery-intro") ||
          (isCurrentMixedToolReplay &&
            message.id === "assistant-current-mixed-mcp-intro")) &&
        hasMcpToolCallGroupForTurn(state, message.turnId);
      const groupedWebSearchIntro =
        isCurrentMixedToolReplay &&
        message.id === "assistant-current-mixed-research-intro" &&
        state.webSearches.some(({ turnId }) => turnId === message.turnId);
      const groupedLongCommandIntro =
        (isCurrentLongCommandReplay &&
          message.id === "assistant-long-command-intro" &&
          state.commands.some(
            ({ id }) => id === "command-long-output",
          ));
      if (
        groupedMcpIntro ||
        groupedWebSearchIntro ||
        groupedLongCommandIntro
      ) {
        return null;
      }
      if (
        scenarioId === "mcp-current-integration-recovery" &&
        message.id === "assistant-current-integration-unavailable-intro"
      ) {
        const unavailableTurnActive = isCurrentTurnGroupActive(
          state,
          message.turnId,
        );
        return (
          <ActivityTimeline
            key={`integration-unavailable:${message.turnId}`}
            open={
              initialSelection.capture &&
              (activeFrame === "mcp-current-integration-unavailable" ||
                activeFrame === "mcp-current-integration-recovering" ||
                activeFrame === "mcp-current-integration-recovered")
                ? true
                : undefined
            }
            summary={
              <TurnDuration
                durationMs={
                  (message.turnId
                    ? state.turnDurationsMs[message.turnId]
                    : undefined) ?? 16_000
                }
                status={unavailableTurnActive ? "working" : "worked"}
              />
            }
          >
            <AgentMessage
              className="demo-mcp-current-unavailable-intro"
              data-item-id={message.id}
              role="assistant"
              status={agentMessageStatus(message.status)}
            >
              <AgentMarkdown>{message.text}</AgentMarkdown>
            </AgentMessage>
          </ActivityTimeline>
        );
      }
      return (
        <Fragment key={`message:${message.id}`}>
          {isCurrentPlan26825Replay &&
          message.id === "assistant-current-plan-26-825" ? (
            <ActivityTimeline
              className="demo-current-plan-26-825__duration"
              data-testid="current-plan-duration"
              summary={
                <TurnDuration
                  durationMs={
                    state.status === "running"
                      ? 7_000
                      : ((message.turnId
                            ? state.turnDurationsMs[message.turnId]
                            : undefined) ?? 32_000)
                  }
                  status={state.status === "running" ? "working" : "worked"}
                />
              }
            />
          ) : null}
          {isCurrentReasoning26825Replay &&
          message.id === "assistant-current-reasoning-26-825" ? (
            <ActivityTimeline
              className="demo-current-reasoning-26-825__duration"
              data-testid="current-reasoning-duration"
              summary={<TurnDuration durationMs={14_000} status="worked" />}
            />
          ) : null}
          {isCurrentBrowserFailure26825Replay &&
          message.id.startsWith("assistant-current-browser-26-825-") ? (
            <ActivityTimeline
              className="demo-current-browser-26-825-failure__duration"
              data-testid={`current-browser-failure-duration-${
                message.id.endsWith("chromium-error")
                  ? "chromium"
                  : "unsupported"
              }`}
              summary={
                <TurnDuration
                  durationMs={
                    message.id.endsWith("chromium-error")
                      ? 226_000
                      : 27_000
                  }
                  status="worked"
                />
              }
            />
          ) : null}
          {isCurrentCitations26825Replay &&
          message.id === "assistant-current-citations-26-825" ? (
            <ActivityTimeline
              className="demo-current-citations-duration"
              summary={<TurnDuration durationMs={24_000} status="worked" />}
            />
          ) : null}
          {isCurrentMarkdown26825Replay &&
          message.id === "assistant-markdown-current-26-825" ? (
            <ActivityTimeline
              className="demo-current-markdown-26-825__duration"
              summary={
                <TurnDuration
                  durationMs={
                    (message.turnId
                      ? state.turnDurationsMs[message.turnId]
                      : undefined) ?? 15_000
                  }
                  status="worked"
                />
              }
            />
          ) : null}
          {isCurrentApproval26825FileReplay &&
          message.id.startsWith("assistant-approval-current-26-825-") ? (
            <ActivityTimeline
              className="demo-current-26-825-file-approval__duration"
              summary={
                <TurnDuration
                  durationMs={
                    message.id.endsWith("denied") ? 10_000 : 13_000
                  }
                  status="worked"
                />
              }
            />
          ) : null}
          <AgentMessage
            actions={
              mode === "replay" &&
              ((scenarioId === "markdown" &&
                message.id === "assistant-markdown") ||
                (isCurrentMarkdown26818Replay &&
                  message.id === "assistant-markdown") ||
                (isCurrentMarkdown26820MediaReplay &&
                  message.id === "assistant-markdown-media") ||
                (isCurrentMarkdown26825Replay &&
                  message.id === "assistant-markdown-current-26-825") ||
                (isCurrentMarkdown26825MediaReplay &&
                  message.id.startsWith(
                    "assistant-markdown-current-26-825-media-",
                  )) ||
                (scenarioId === "markdown-table-actions" &&
                  message.id === "assistant-markdown-table-actions") ||
                (scenarioId === "markdown-streaming-large" &&
                  message.id === "assistant-markdown-streaming-large") ||
                (scenarioId === "mcp-tool-call" &&
                  message.id === "assistant-mcp") ||
                (isCurrentMcpSuccessReplay &&
                  (message.id === "assistant-current-mcp-success" ||
                    message.id ===
                      "assistant-current-mcp-26-818-success" ||
                    message.id ===
                      "assistant-current-mcp-26-820-success" ||
                    message.id ===
                      "assistant-current-mcp-26-825-success")) ||
                (isCurrentMcpRecoveryReplay &&
                  (message.id === "assistant-current-mcp-recovery" ||
                    message.id ===
                      "assistant-current-mcp-26-818-recovery" ||
                    message.id ===
                      "assistant-current-mcp-26-820-recovery" ||
                    message.id ===
                      "assistant-current-mcp-26-825-recovery")) ||
                (scenarioId === "mcp-current-integration-recovery" &&
                  (message.id ===
                    "assistant-current-integration-unavailable" ||
                    message.id ===
                      "assistant-current-integration-recovered")) ||
                (scenarioId === "mcp-recovery-mixed-thread" &&
                  (message.id === "assistant-recovery" ||
                    message.id === "assistant-workflow")) ||
                ((scenarioId === "approval-current-26-820-file" ||
                  scenarioId === "approval-current-26-825-file" ||
                  scenarioId === "approval-denied" ||
                  scenarioId === "approval-allow-once" ||
                  scenarioId === "approval-similar-commands") &&
                  (message.id ===
                    "assistant-approval-current-26-820-denied" ||
                    message.id ===
                      "assistant-approval-current-26-820-allowed" ||
                    message.id ===
                      "assistant-approval-current-26-825-denied" ||
                    message.id ===
                      "assistant-approval-current-26-825-allowed" ||
                    message.id === "assistant-approval-denied" ||
                    message.id === "assistant-approval-approved" ||
                    message.id === "assistant-approval-allow-once" ||
                    message.id === "assistant-approval-similar-first" ||
                    message.id === "assistant-approval-similar-second")) ||
                (scenarioId === "long-command-output" &&
                  message.id === "assistant-long-command-final") ||
                (isAnyCurrentBasicMessageReplay &&
                  (message.id === "assistant-current-basic" ||
                    message.id === "assistant-current-basic-26-825")) ||
                (isCurrentBrowserFailure26825Replay &&
                  message.id.startsWith(
                    "assistant-current-browser-26-825-",
                  )) ||
                (isCurrentCitations26825Replay &&
                  message.id === "assistant-current-citations-26-825") ||
                (scenarioId === "command-failure-recovery" &&
                  (message.id === "assistant-command-failure-recovered" ||
                    message.id === "assistant-command-follow-up")) ||
                (scenarioId === "interruption" &&
                  message.id ===
                    "assistant-command-interruption-recovery") ||
                (isCurrentCommandReplay &&
                  message.id.startsWith("assistant-command-current-26-8")) ||
                (isCurrentSubagentReplay &&
                  message.id.startsWith("assistant-subagent-")) ||
                (isCurrentMixedToolReplay &&
                  message.id.startsWith("assistant-current-mixed-") &&
                  !message.id.endsWith("-intro")) ||
                (scenarioId === "compaction" &&
                  (message.id === "assistant-compaction-baseline" ||
                    message.id ===
                      "assistant-context-compaction-recovery" ||
                    message.id ===
                      "assistant-context-compaction-repeated-recovery"))) &&
              message.status === "completed" ? (
                isCurrentMcpReplay ||
                scenarioId === "mcp-tool-call" ||
                scenarioId === "mcp-recovery-mixed-thread" ||
                scenarioId === "approval-current-26-820-file" ||
                scenarioId === "approval-current-26-825-file" ||
                scenarioId === "approval-allow-once" ||
                scenarioId === "approval-denied" ||
                scenarioId === "approval-similar-commands" ||
                scenarioId === "long-command-output" ||
                isCurrentCommandReplay ||
                isAnyCurrentBasicMessageReplay ||
                isCurrentCitations26825Replay ||
                isCurrentMarkdown26818Replay ||
                isCurrentBrowserFailure26825Replay ||
                isCurrentMarkdown26820MediaReplay ||
                isCurrentMarkdown26825MediaReplay ||
                isCurrentMarkdown26825Replay ||
                isCurrentRichMarkdownStreamingReplay ||
                isCurrentSubagentReplay ? (
                  <McpResponseActions
                    copyLabel={
                      isAnyCurrentBasicMessageReplay ||
                      isCurrentCitations26825Replay ||
                      isCurrentMarkdown26818Replay ||
                      isCurrentBrowserFailure26825Replay ||
                      isCurrentMarkdown26820MediaReplay ||
                      isCurrentMarkdown26825MediaReplay ||
                      usesCurrentMarkdown26825Presentation
                        ? "Copy"
                        : undefined
                    }
                    label={
                      isAnyCurrentBasicMessageReplay ||
                      isCurrentCitations26825Replay ||
                      isCurrentMarkdown26818Replay ||
                      isCurrentMarkdown26820MediaReplay ||
                      isCurrentMarkdown26825MediaReplay ||
                      usesCurrentMarkdown26825Presentation
                        ? null
                        : message.id === "assistant-workflow" ||
                      message.id ===
                        "assistant-approval-current-26-820-denied" ||
                      message.id ===
                        "assistant-approval-current-26-820-allowed" ||
                      message.id ===
                        "assistant-approval-current-26-825-denied" ||
                      message.id ===
                        "assistant-approval-current-26-825-allowed" ||
                      message.id === "assistant-approval-denied" ||
                      message.id === "assistant-approval-approved" ||
                      message.id === "assistant-approval-allow-once" ||
                      message.id === "assistant-approval-similar-first" ||
                      message.id === "assistant-approval-similar-second"
                        ? "Response actions"
                        : undefined
                    }
                    toolbar={
                      !isAnyCurrentBasicMessageReplay &&
                      !isCurrentCitations26825Replay &&
                      !isCurrentMarkdown26818Replay &&
                      !isCurrentBrowserFailure26825Replay &&
                      !isCurrentMarkdown26820MediaReplay &&
                      !isCurrentMarkdown26825MediaReplay &&
                      !usesCurrentMarkdown26825Presentation
                    }
                  />
                ) : (
                  <span
                    aria-label="Markdown response actions"
                    className="demo-turn-actions"
                    role="toolbar"
                  >
                    <button aria-label="Copy response" type="button">
                      ▣
                    </button>
                    <button aria-label="Good response" type="button">
                      ♡
                    </button>
                    <button aria-label="Bad response" type="button">
                      ♢
                    </button>
                    <button aria-label="Share response" type="button">
                      ↗
                    </button>
                  </span>
                )
              ) : undefined
            }
            attachments={
              submittedMessageAttachments
                ? submittedMessageAttachments.map((attachment) => (
                    <MessageAttachment
                      alt={
                        attachment.kind === "image" ? attachment.label : ""
                      }
                      icon={
                        attachment.kind === "folder" ? (
                          <CurrentBuildIcon name="composer-project" />
                        ) : attachment.kind === "file" ? (
                          <span className="demo-current-file-type">
                            {attachment.meta?.split(/\s|·/)[0] ?? "FILE"}
                          </span>
                        ) : undefined
                      }
                      key={`${message.id}:submitted-attachment:${attachment.id}`}
                      kind={attachment.kind === "image" ? "image" : "file"}
                      label={attachment.label}
                      meta={attachment.meta}
                      onClick={() => undefined}
                      previewSrc={attachment.previewSrc}
                    />
                  ))
                : message.role === "user" && message.attachments?.length
                ? message.attachments.map((attachment, index) => (
                    <MessageAttachment
                      alt={messageAttachmentAccessibleLabel(
                        attachment,
                        index,
                        message.attachments?.length ?? 0,
                      )}
                      key={`${message.id}:attachment:${index}`}
                      label={messageAttachmentAccessibleLabel(
                        attachment,
                        index,
                        message.attachments?.length ?? 0,
                      )}
                      onClick={() => undefined}
                      previewSrc={messageAttachmentPreviewSource(
                        attachment,
                        attachmentPreviewDataUrl,
                      )}
                    />
                  ))
                : undefined
            }
            data-item-id={message.id}
            role={message.role}
            status={agentMessageStatus(message.status)}
          >
            {message.role === "assistant" ? (
              message.id === "assistant-current-mcp-26-818-success" ? (
                <CurrentMcpAnswer />
              ) : message.id ===
                "assistant-current-mcp-26-818-recovery" ? (
                <CurrentMcpAnswer recovery />
              ) : message.id ===
                "assistant-current-mcp-26-820-success" ? (
                <CurrentMcpAnswer current26820 />
              ) : message.id ===
                "assistant-current-mcp-26-820-recovery" ? (
                <CurrentMcpAnswer current26820 recovery />
              ) : message.id ===
                "assistant-current-mcp-26-825-success" ? (
                <CurrentMcpAnswer current26825 />
              ) : message.id ===
                "assistant-current-mcp-26-825-recovery" ? (
                <CurrentMcpAnswer current26825 recovery />
              ) : message.id ===
                "assistant-current-citations-26-825" ? (
                <CurrentCitationAnswer />
              ) : (
                <AgentMarkdown
                  allowWideMedia={
                    isCurrentMarkdown26820MediaReplay ||
                    isCurrentMarkdown26825MediaReplay
                  }
                  allowWideTables={scenarioId === "markdown-table-actions"}
                  codeBlockCopyAriaLabel={
                    usesCurrentMarkdown26825Presentation ? "Copy" : undefined
                  }
                  codeBlockCopyLabel={
                    usesCurrentMarkdown26825Presentation
                      ? currentMarkdownCodeCopyLabel
                      : undefined
                  }
                  codeBlockLanguageIcon={
                    usesCurrentMarkdown26825Presentation
                      ? currentMarkdownCodeLanguageIcon
                      : undefined
                  }
                  codeBlockLanguageLabels={
                    usesCurrentMarkdown26825Presentation
                      ? currentMarkdownLanguageLabels
                      : undefined
                  }
                  codeBlockWrapIcon={
                    isCurrentMarkdown26825Replay
                      ? currentMarkdownCodeWrapIcon
                      : undefined
                  }
                  codeBlockWrapToggleable={
                    isCurrentMarkdown26818Replay ||
                    usesCurrentMarkdown26825Presentation
                  }
                  components={
                    usesCurrentMarkdown26825Presentation
                      ? currentMarkdownComponents
                      : undefined
                  }
                  density={
                    usesCurrentMarkdown26825Presentation ? "compact" : "regular"
                  }
                  expandWideMedia={isCurrentMarkdown26825MediaReplay}
                  imageSourceResolver={
                    isCurrentMarkdown26820MediaReplay ||
                    isCurrentMarkdown26825MediaReplay
                      ? currentMarkdownMediaSource
                      : undefined
                  }
                  imagePreviewSourceResolver={
                    isCurrentMarkdown26825MediaReplay ? () => "" : undefined
                  }
                  imageStatus={
                    isCurrentMarkdown26820MediaReplay ||
                    isCurrentMarkdown26825MediaReplay
                      ? currentMarkdownMediaStatus
                      : undefined
                  }
                  linkTarget="_blank"
                  streaming={message.status === "running"}
                >
                  {message.text || " "}
                </AgentMarkdown>
              )
            ) : (
              message.id ===
              "user-current-browser-26-825-chromium-error" ? (
                <CurrentBrowserFailurePrompt />
              ) : message.id ===
                "user-current-browser-26-825-unsupported-error" ? (
                <CurrentBrowserFailurePrompt retry />
              ) : (
                submittedMessageText || null
              )
            )}
          </AgentMessage>
          {message.interruptionDurationMs !== undefined ? (
            <ThreadInterruptionSummary
              durationMs={message.interruptionDurationMs ?? 0}
              label={
                message.interruptionDurationMs === null
                  ? "You stopped"
                  : undefined
              }
              stoppedLabel={(time) => `You stopped after ${time}`}
            />
          ) : null}
          {message.compaction ? (
            <ThreadContextEvent
              mode={
                isCurrentContextCompactionReplay ? "manual" : "automatic"
              }
              status={message.compaction}
            />
          ) : null}
          {mode === "replay" &&
          scenarioId === "multi-file-review" &&
          message.id === "user-multi-file" ? (
            <ActivityTimeline
              summary={<TurnDuration durationMs={24_000} status="worked" />}
            />
          ) : mode === "replay" &&
            scenarioId === "current-review-rename" &&
            message.id === "user-current-review-rename" ? (
            <ActivityTimeline
              summary={<TurnDuration durationMs={52_000} status="worked" />}
            />
          ) : mode === "replay" &&
            scenarioId === "current-review-26-825-files" &&
            message.id === "user-current-review-26-825-files" ? (
            <ActivityTimeline
              summary={<TurnDuration durationMs={20_000} status="worked" />}
            />
          ) : null}
        </Fragment>
      );
    }

    if (entry.kind === "webSearch") {
      const webSearch = state.webSearches.find(({ id }) => id === entry.id);
      if (!webSearch) return null;
      const turnSearches = state.webSearches.filter(
        ({ turnId }) => turnId === webSearch.turnId,
      );
      if (turnSearches[0]?.id !== entry.id) return null;

      const searchActions = turnSearches.filter(
        ({ action }) => action === "search",
      );
      const browserActions = turnSearches.filter(
        ({ action }) => action === "openPage" || action === "findInPage",
      );
      const intro = state.messages.find(
        ({ id, turnId }) =>
          turnId === webSearch.turnId &&
          id === "assistant-current-mixed-research-intro",
      );
      const active = turnSearches.some(({ status }) => status === "running");
      const currentSearchTimelineOpen =
        isCurrentSearch26825Replay &&
        (activeFrame ===
          "conversation-search-current-26-825-worked-open" ||
          activeFrame === "conversation-search-current-26-825-open");
      const currentSearchActivityOpen =
        isCurrentSearch26825Replay &&
        activeFrame === "conversation-search-current-26-825-open";
      const captureOpen =
        initialSelection.capture &&
        (activeFrame === "current-mixed-research-running" ||
          activeFrame === "current-mixed-research-completed" ||
          currentSearchTimelineOpen);
      const searchCaptureOpen =
        captureOpen &&
        (!isCurrentSearch26825Replay ||
          activeFrame === "conversation-search-current-26-825-open");
      const searchEntries = searchActions.flatMap((search) =>
        search.results.map((result) => ({
          completed: search.status === "completed",
          detail: result.detail,
          id: result.id,
        })),
      );
      const browserSteps = browserActions.map((action) => ({
        completed: action.status === "completed",
        id: action.id,
        kind: "navigation" as const,
        label:
          action.action === "openPage"
            ? `Opened ${action.target ?? action.query}`
            : `Found ${action.target ?? action.query}`,
      }));
      const durationMs =
        (webSearch.turnId
          ? state.turnDurationsMs[webSearch.turnId]
          : undefined) ?? 22_000;

      return (
        <ActivityTimeline
          className={
            isCurrentSearch26825Replay
              ? "demo-current-search-26-825-timeline"
              : "demo-current-mixed-research-timeline"
          }
          defaultOpen={currentSearchTimelineOpen}
          key={`web-search:${webSearch.turnId}`}
          open={initialSelection.capture ? captureOpen : undefined}
          summary={
            <TurnDuration
              durationMs={active ? 0 : durationMs}
              status={active ? "working" : "worked"}
            />
          }
        >
          {intro ? (
            <AgentMessage
              className="demo-current-mixed-research-intro"
              data-item-id={intro.id}
              role="assistant"
              status={agentMessageStatus(intro.status)}
            >
              <AgentMarkdown>{intro.text}</AgentMarkdown>
            </AgentMessage>
          ) : null}
          {searchActions.length > 0 ? (
            <SearchActivity
              data-item-id={searchActions[0]?.id}
              entries={searchEntries}
              defaultOpen={currentSearchActivityOpen}
              kind="web"
              open={initialSelection.capture ? searchCaptureOpen : undefined}
              query={searchActions.at(-1)?.query}
              status={
                searchActions.some(({ status }) => status === "running")
                  ? "running"
                  : "completed"
              }
            />
          ) : null}
          {browserActions.length > 0 ? (
            <BrowserActivity
              data-item-id={browserActions[0]?.id}
              open={initialSelection.capture ? captureOpen : undefined}
              status={
                browserActions.some(({ status }) => status === "running")
                  ? "running"
                  : "completed"
              }
              steps={browserSteps}
            />
          ) : null}
        </ActivityTimeline>
      );
    }

    if (entry.kind === "mcpToolCall") {
      const calls = mcpToolCallGroupForEntry(state, entryIndex);
      if (!calls) return null;
      if (isCurrentBrowserFailure26825Replay) return null;
      const toolCall = calls[0];
      if (
        isCurrentBrowser26825Replay &&
        calls.some(({ browserUse }) => browserUse)
      ) {
        const browserActivityOpen =
          activeFrame === "conversation-browser-current-26-825-open";
        const timelineOpen =
          browserActivityOpen ||
          activeFrame ===
            "conversation-browser-current-26-825-worked-open";
        const steps = [
          {
            completed: true,
            icon: <CurrentBuildIcon name="thread-command-terminal" />,
            id: "browser-current-26-825-skill",
            kind: "instruction" as const,
            label: "Read Control In App Browser skill",
          },
          ...calls.map((call, index) => {
            const argumentsRecord =
              typeof call.arguments === "object" &&
              call.arguments !== null &&
              !Array.isArray(call.arguments)
                ? call.arguments
                : {};
            const title =
              typeof argumentsRecord.title === "string"
                ? argumentsRecord.title
                : call.toolLabel;
            return {
              completed: call.status === "completed",
              icon: (
                <CurrentBuildIcon
                  name={
                    call.browserUse
                      ? "thread-mcp-tool"
                      : "thread-command-terminal"
                  }
                />
              ),
              id: call.id,
              kind: (index === 0 ? "connection" : "navigation") as
                | "connection"
                | "navigation",
              label: title,
            };
          }),
        ];

        return (
          <ActivityTimeline
            className="demo-current-browser-26-825-timeline"
            defaultOpen={timelineOpen}
            key={`browser-use:${toolCall.turnId}`}
            open={initialSelection.capture ? timelineOpen : undefined}
            summary={
              <TurnDuration
                durationMs={mcpToolCallGroupDurationMs(state, calls)}
                status="worked"
              />
            }
          >
            <BrowserActivity
              completedLabel="Used the browser, loaded a tool"
              data-item-id={toolCall.id}
              defaultOpen={browserActivityOpen}
              indicator={<CurrentBuildIcon name="thread-mcp-tool" />}
              open={
                initialSelection.capture ? browserActivityOpen : undefined
              }
              status="completed"
              steps={steps}
            />
          </ActivityTimeline>
        );
      }
      if (
        isCurrentMcp26820RecoveryReplay &&
        activeFrame === "mcp-current-26-820-recovery-failed" &&
        toolCall.id === "mcp-current-26-820-fetch-invalid"
      ) {
        return (
          <ActivityTimeline
            key={`mcp-current-26-820-failed:${toolCall.turnId}`}
            open={initialSelection.capture ? true : undefined}
            summary={<TurnDuration durationMs={3_000} status="working" />}
          >
            <ToolCallCard
              className="demo-current-26-820-mcp-failed-call"
              collapsible={false}
              data-item-id={toolCall.id}
              failedLabel={toolCall.toolLabel}
              icon={<CurrentBuildIcon name="thread-mcp-tool" />}
              name={toolCall.toolLabel}
              role="listitem"
              source={toolCall.server}
              status="failed"
            />
          </ActivityTimeline>
        );
      }
      if (scenarioId === "mcp-recovery-mixed-thread") {
        const failedCall = calls.find(
          ({ id }) => id === "mcp-fetch-invalid",
        );
        if (!failedCall || entry.id !== failedCall.id) return null;

        const recoveryCalls = calls.filter(
          ({ id }) => id !== failedCall.id,
        );
        const toolIntro = state.messages.find(
          ({ id }) => id === "assistant-recovery-intro",
        );
        const recoveryStatus = state.messages.find(
          ({ id }) => id === "assistant-recovery-status",
        );
        const failedPresentation =
          mcpToolCallPresentation(failedCall);
        const recoveryGroupStatus =
          recoveryCalls.length > 0
            ? mcpToolCallGroupStatus(recoveryCalls)
            : undefined;
        const captureOpen =
          initialSelection.capture &&
          (activeFrame === "mcp-running" ||
            activeFrame === "mcp-progress" ||
            activeFrame === "mcp-tool-calls" ||
            activeFrame === "mcp-recovery-failed" ||
            activeFrame === "mcp-recovery-retrying" ||
            activeFrame === "mcp-recovery-completed");
        const durationMs = mcpToolCallGroupDurationMs(state, calls);

        return (
          <ActivityTimeline
            key={`mcp-recovery:${failedCall.turnId}:${failedCall.server}`}
            open={initialSelection.capture ? captureOpen : undefined}
            summary={
              <TurnDuration
                durationMs={durationMs}
                status={
                  state.currentTurnId === failedCall.turnId
                    ? "working"
                    : "worked"
                }
              />
            }
          >
            {toolIntro ? (
              <AgentMessage
                className="demo-mcp-recovery-intro"
                data-item-id={toolIntro.id}
                role="assistant"
                status={agentMessageStatus(toolIntro.status)}
              >
                <AgentMarkdown>{toolIntro.text}</AgentMarkdown>
              </AgentMessage>
            ) : null}
            <ToolCallCard
              className="demo-mcp-recovery-failed-call"
              data-item-id={failedCall.id}
              error={failedPresentation.error}
              errorLanguage="plaintext"
              errorPresentation="output"
              failedAriaLabel={`${failedCall.toolLabel} failed`}
              failedLabel={failedCall.toolLabel}
              icon={<McpToolIcon />}
              name={failedCall.toolLabel}
              open={
                initialSelection.capture &&
                (activeFrame === "mcp-recovery-failed" ||
                  activeFrame === "mcp-recovery-completed")
                  ? true
                  : undefined
              }
              onViewRawOutput={(value) =>
                setRawToolOutput({
                  name: failedCall.toolLabel,
                  value,
                })
              }
              rawOutput={{
                arguments: failedCall.arguments,
                error: failedCall.error,
              }}
              result={failedPresentation.result}
              role="listitem"
              source={failedCall.server}
              status={failedCall.status}
              structuredContent={failedPresentation.structuredContent}
              summary={failedPresentation.summary}
            />
            {recoveryStatus ? (
              <AgentMessage
                className="demo-mcp-recovery-status"
                data-item-id={recoveryStatus.id}
                role="assistant"
                status={agentMessageStatus(recoveryStatus.status)}
              >
                <AgentMarkdown>{recoveryStatus.text}</AgentMarkdown>
              </AgentMessage>
            ) : null}
            {recoveryCalls.length > 0 && recoveryGroupStatus ? (
              <McpToolCallGroup
                data-testid="mcp-tool-call-group"
                defaultOpen={false}
                name={recoveryCalls[0]?.appName ?? failedCall.appName}
                open={initialSelection.capture ? captureOpen : undefined}
                source={recoveryCalls[0]?.server ?? failedCall.server}
                status={recoveryGroupStatus}
              >
                {recoveryCalls.map((call) => {
                  const presentation = mcpToolCallPresentation(call);
                  return (
                    <ToolCallCard
                      data-item-id={call.id}
                      error={presentation.error}
                      icon={<McpToolIcon />}
                      key={call.id}
                      name={call.toolLabel}
                      result={presentation.result}
                      role="listitem"
                      source={call.server}
                      status={call.status}
                      structuredContent={presentation.structuredContent}
                      summary={presentation.summary}
                    />
                  );
                })}
              </McpToolCallGroup>
            ) : null}
          </ActivityTimeline>
        );
      }
      const toolIntro = state.messages.find(
        ({ id, turnId }) =>
          turnId === toolCall.turnId &&
          (id === "assistant-mcp-intro" ||
            (scenarioId === "mcp-current-integration-recovery" &&
              id === "assistant-current-integration-recovery-intro") ||
            (isCurrentMixedToolReplay &&
              id === "assistant-current-mixed-mcp-intro")),
      );
      const groupStatus = mcpToolCallGroupStatus(calls);
      const currentMcpTurnActive = isCurrentTurnGroupActive(
        state,
        toolCall.turnId,
      );
      const presentedGroupStatus =
        currentMcpTurnActive ? "running" : groupStatus;
      const currentMcpCaptureOpen =
        (isCurrentMcpSuccessReplay &&
          (activeFrame === "mcp-current-running" ||
            activeFrame === "mcp-current-success" ||
            activeFrame === "mcp-current-26-818-running" ||
            activeFrame === "mcp-current-26-818-success" ||
            activeFrame === "mcp-current-26-820-running" ||
            activeFrame === "mcp-current-26-820-success" ||
            activeFrame === "mcp-current-26-825-success" ||
            activeFrame === "mcp-current-26-825-recovery")) ||
        (isCurrentMcpRecoveryReplay &&
          (activeFrame === "mcp-current-recovery-failed" ||
            activeFrame === "mcp-current-recovery-retrying" ||
            activeFrame === "mcp-current-recovery-completed" ||
            activeFrame === "mcp-current-26-818-recovery-failed" ||
            activeFrame === "mcp-current-26-818-recovery-retrying" ||
            activeFrame === "mcp-current-26-818-recovery-completed" ||
            activeFrame === "mcp-current-26-820-recovery-retrying" ||
            activeFrame === "mcp-current-26-820-recovery-completed" ||
            activeFrame === "mcp-current-26-825-recovery")) ||
        (scenarioId === "mcp-current-integration-recovery" &&
          (activeFrame === "mcp-current-integration-recovering" ||
            activeFrame === "mcp-current-integration-recovered")) ||
        (isCurrentMixedToolReplay &&
          (activeFrame === "current-mixed-mcp-running" ||
            activeFrame === "current-mixed-mcp-completed"));
      const captureOpen =
        initialSelection.capture &&
        (currentMcpCaptureOpen ||
          activeFrame === "mcp-running" ||
          activeFrame === "mcp-progress" ||
          activeFrame === "mcp-tool-calls");
      const durationMs = mcpToolCallGroupDurationMs(state, calls);
      return (
        <ActivityTimeline
          key={`mcp-group:${toolCall.turnId}:${toolCall.server}`}
          open={initialSelection.capture ? captureOpen : undefined}
          summary={
            <TurnDuration
              durationMs={durationMs}
              status={
                presentedGroupStatus === "running"
                  ? "working"
                  : "worked"
              }
            />
          }
        >
          {toolIntro ? (
            <AgentMessage
              className="demo-mcp-recovery-intro demo-mcp-current-intro"
              data-item-id={toolIntro.id}
              role="assistant"
              status={agentMessageStatus(toolIntro.status)}
            >
              <AgentMarkdown>{toolIntro.text}</AgentMarkdown>
            </AgentMessage>
          ) : null}
          <McpToolCallGroup
            data-testid="mcp-tool-call-group"
            defaultOpen={false}
            disclosureIcon={
              isCurrentMcpReplay ? (
                <CurrentBuildIcon name="thread-activity-chevron" />
              ) : undefined
            }
            disclosureMode={isCurrentMcpReplay ? "button" : undefined}
            icon={
              isCurrentMcpReplay ? (
                <CurrentBuildIcon name="thread-mcp-tool" />
              ) : undefined
            }
            name={toolCall.appName}
            open={initialSelection.capture ? captureOpen : undefined}
            source={toolCall.server}
            status={presentedGroupStatus}
          >
            {calls.map((call) => {
              const presentation = mcpToolCallPresentation(call);
              return (
                <ToolCallCard
                  collapsible={!usesCurrentMcpFlatRows}
                  data-item-id={call.id}
                  disclosureIcon={
                    isCurrentMcpReplay && !usesCurrentMcpFlatRows ? (
                      <CurrentBuildIcon name="thread-activity-chevron" />
                    ) : undefined
                  }
                  disclosureMode={
                    isCurrentMcpReplay && !usesCurrentMcpFlatRows
                      ? "overlay-button"
                      : undefined
                  }
                  error={
                    usesCurrentMcpFlatRows
                      ? undefined
                      : presentation.error
                  }
                  errorLanguage={
                    call.status === "failed" && !usesCurrentMcpFlatRows
                      ? "plaintext"
                      : undefined
                  }
                  errorPresentation={
                    call.status === "failed" && !usesCurrentMcpFlatRows
                      ? "output"
                      : undefined
                  }
                  failedAriaLabel={
                    call.status === "failed" && !usesCurrentMcpFlatRows
                      ? `${call.toolLabel} failed`
                      : undefined
                  }
                  failedLabel={call.toolLabel}
                  key={call.id}
                  icon={
                    isCurrentMcpReplay ? (
                      <CurrentBuildIcon name="thread-mcp-tool" />
                    ) : (
                      <McpToolIcon />
                    )
                  }
                  name={call.toolLabel}
                  open={
                    initialSelection.capture &&
                    (call.id === "mcp-fetch-invalid" ||
                      call.id === "mcp-current-fetch-invalid" ||
                      call.id === "mcp-current-26-818-fetch-invalid") &&
                    (activeFrame === "mcp-recovery-failed" ||
                      activeFrame === "mcp-recovery-completed" ||
                      activeFrame === "mcp-current-recovery-failed" ||
                      activeFrame === "mcp-current-recovery-completed" ||
                      activeFrame ===
                        "mcp-current-26-818-recovery-failed" ||
                      activeFrame ===
                        "mcp-current-26-818-recovery-completed")
                      ? true
                      : undefined
                  }
                  onViewRawOutput={
                    call.status === "failed" && !usesCurrentMcpFlatRows
                      ? (value) =>
                          setRawToolOutput({
                            name: call.toolLabel,
                            value,
                          })
                      : undefined
                  }
                  rawOutput={
                    call.status === "failed" && !usesCurrentMcpFlatRows
                      ? {
                          arguments: call.arguments,
                          error: call.error,
                        }
                      : undefined
                  }
                  result={presentation.result}
                  role="listitem"
                  source={call.server}
                  status={call.status}
                  structuredContent={presentation.structuredContent}
                  summary={presentation.summary}
                />
              );
            })}
          </McpToolCallGroup>
        </ActivityTimeline>
      );
    }

    if (entry.kind === "subagent") {
      const presentation = subagentTimelinePresentation(state, entry.id);
      if (!presentation || presentation.anchor.callId !== entry.id) return null;
      const groupTurnId = presentation.turnId;
      const turnActive = presentation.active;
      const groupedSubagents = presentation.rows;
      const callSubagents = groupedSubagents.map((subagent) =>
        presentSubagent(subagent, mode, subagentClockMs),
      );
      if (callSubagents.length === 0) return null;
      const activityStatuses = new Map(
        groupedSubagents.map((subagent) => [
          subagent.id,
          subagentActivityStatus(subagent),
        ]),
      );
      const working = callSubagents.filter(
        ({ status }) => status !== "done",
      );
      const activityItems =
        turnActive
          ? callSubagents
          : isCurrentMixedToolReplay
            ? callSubagents
            : working.length > 0 || mode !== "live"
            ? working
            : callSubagents;
      const startedAtMs = presentation.startedAtMs;
      const completedAtMs = presentation.completedAtMs;
      const settledTurnDurationMs =
        working.length === 0 && groupTurnId !== null
          ? state.turnDurationsMs[groupTurnId]
          : undefined;
      return (
        <ActivityTimeline
          className="demo-subagent-activity-timeline"
          defaultOpen={mode === "live" && turnActive}
          key={`subagent:${entry.id}:${turnActive ? "active" : "settled"}`}
          open={
            initialSelection.capture
              ? (isCurrentMixedToolReplay &&
                  activeFrame === "current-mixed-completed") ||
                (turnActive && activityItems.length > 0)
              : undefined
          }
          summary={
            <TurnDuration
              {...(mode === "live"
                ? settledTurnDurationMs !== undefined
                  ? { durationMs: settledTurnDurationMs }
                  : {
                      completedAtMs:
                        working.length === 0 ? completedAtMs : undefined,
                      startedAtMs,
                    }
                : {
                    durationMs:
                      working.length > 0
                        ? 14_000
                        : settledTurnDurationMs !== undefined
                          ? settledTurnDurationMs
                          : turnActive &&
                              startedAtMs !== undefined &&
                              completedAtMs !== undefined
                            ? Math.max(0, completedAtMs - startedAtMs)
                            : state.turnDurationMs ?? 45_000,
                  })}
              status={working.length > 0 ? "working" : "worked"}
            />
          }
        >
          {activityItems.length > 1 ? (
            <SubagentActivityGroup
              items={activityItems.map((item) => ({
                activityStatus: activityStatuses.get(item.id) ?? "active",
                id: item.id,
                name: item.name,
              }))}
              onOpen={(item) => openSubagentPanel(item.id)}
            />
          ) : (
            activityItems.map((item) => (
              <SubagentActivity
                item={{
                  activityStatus: activityStatuses.get(item.id) ?? "active",
                  id: item.id,
                  name: item.name,
                }}
                key={item.id}
                onOpen={() => {
                  openSubagentPanel(item.id);
                }}
              />
            ))
          )}
        </ActivityTimeline>
      );
    }

    if (entry.kind === "command") {
      const command = state.commands.find(({ id }) => id === entry.id);
      if (!command) return null;
      if (
        isCurrentApprovalReplay &&
        (command.id === "command-open-calculator" ||
          command.id === "command-create-approval-sentinel" ||
          command.id === "command-open-calculator-once" ||
          command.id === "command-open-calculator-similar-first" ||
          command.id === "command-open-calculator-similar-second")
      ) {
        const pending = command.status === "running";
        const approved = command.status === "completed";
        const pendingDurationMs =
          scenarioId === "approval-allow-once"
            ? 273_000
            : scenarioId === "approval-similar-commands"
              ? 98_000
          : 75_000;
        const completedTurnDurationMs = command.turnId
          ? state.turnDurationsMs[command.turnId]
          : undefined;
        return (
          <ActivityTimeline
            key={`command:${command.id}`}
            open={initialSelection.capture && pending ? true : undefined}
            summary={
              <TurnDuration
                durationMs={
                  pending
                    ? pendingDurationMs
                    : (completedTurnDurationMs ??
                      state.turnDurationMs ??
                      (scenarioId === "approval-denied"
                        ? 113_000
                        : 23_000))
                }
                status={pending ? "working" : "worked"}
              />
            }
          >
            <CommandExecution
              command={command.command}
              cwd={command.cwd}
              data-item-id={command.id}
              data-testid="command-execution"
              hideRawCommand
              status={command.status}
              summary={
                pending ? (
                  <>Running {command.command}</>
                ) : approved ? (
                  <>Completed {command.command}</>
                ) : (
                  <>Did not run {command.command}</>
                )
              }
            />
          </ActivityTimeline>
        );
      }
      if (
        isCurrentCommandReplay &&
        command.id.startsWith("command-current-26-8")
      ) {
        const running =
          command.status === "running" && state.status === "running";
        if (isCurrentCommand26825InterruptionReplay) {
          const stopped = !running;
          const execution = (
            <CommandExecution
              command={command.command}
              data-item-id={command.id}
              data-testid="command-execution"
              hideRawCommand
              indicator={
                stopped ? (
                  <span
                    aria-hidden="true"
                    className="demo-command-stop-indicator"
                  />
                ) : undefined
              }
              open={false}
              status={stopped ? "interrupted" : "running"}
              terminalIcon={
                <CurrentBuildIcon name="thread-command-terminal" />
              }
              summary={
                stopped ? (
                  <>Background terminal stopped with {command.command}</>
                ) : (
                  <>Running {command.command}</>
                )
              }
            />
          );
          return running ? (
            <ActivityTimeline
              key={`command:${command.id}`}
              open
              summary={<TurnDuration durationMs={19_000} status="working" />}
            >
              {execution}
            </ActivityTimeline>
          ) : (
            <Fragment key={`command:${command.id}`}>{execution}</Fragment>
          );
        }
        const turnDurationMs = isCurrentCommand26825SuccessReplay
          ? 8_000
          : isCurrentCommand26825FailureReplay
            ? 15_000
          : isCurrentCommand26820SuccessReplay
            ? 22_000
            : 12_000;
        return (
          <ActivityTimeline
            key={`command:${command.id}`}
            open={initialSelection.capture ? true : undefined}
            summary={
              <TurnDuration
                durationMs={running
                  ? isCurrentCommand26825SuccessReplay
                    ? 4_000
                    : isCurrentCommand26820SuccessReplay
                      ? 9_000
                      : 5_000
                  : turnDurationMs}
                status={running ? "working" : "worked"}
              />
            }
          >
            <CommandExecution
              command={command.command}
              data-item-id={command.id}
              data-testid="command-execution"
              hideRawCommand
              status={command.status}
              terminalIcon={
                <CurrentBuildIcon name="thread-command-terminal" />
              }
              summary={
                <>{running ? "Running " : "Ran "}{command.command}</>
              }
            />
          </ActivityTimeline>
        );
      }
      if (
        isCurrentLongCommandReplay &&
        command.id === "command-long-output"
      ) {
        const intro = state.messages.find(
          ({ id }) => id === "assistant-long-command-intro",
        );
        return (
          <ActivityTimeline
            defaultOpen={false}
            key={`command:${command.id}`}
            summary={
              <TurnDuration
                durationMs={state.turnDurationMs ?? 10_000}
                status="worked"
              />
            }
          >
            {intro ? (
              <AgentMessage
                data-item-id={intro.id}
                role="assistant"
                status={agentMessageStatus(intro.status)}
              >
                <AgentMarkdown>{intro.text}</AgentMarkdown>
              </AgentMessage>
            ) : null}
            <CommandExecution
              command={command.command}
              copyCommandLabel="Copy"
              cwd={command.cwd}
              data-item-id={command.id}
              data-testid="command-execution"
              defaultOpen={false}
              durationMs={command.durationMs ?? undefined}
              exitCode={command.exitCode ?? undefined}
              status={command.status}
              terminalIcon={
                <CurrentBuildIcon name="thread-command-terminal" />
              }
            >
              <CommandOutput
                copyLabel="Copy"
                copyText={command.output}
              >
                {command.output}
              </CommandOutput>
            </CommandExecution>
          </ActivityTimeline>
        );
      }
      if (
        isCurrentCommandFailureReplay &&
        command.id === "command-failure-output"
      ) {
        return (
          <ActivityTimeline
            defaultOpen={false}
            key={`command:${command.id}`}
            summary={
              <TurnDuration
                durationMs={
                  command.status === "running"
                    ? 0
                    : ((command.turnId
                        ? state.turnDurationsMs[command.turnId]
                        : undefined) ?? 10_000)
                }
                status={command.status === "running" ? "working" : "worked"}
              />
            }
          >
            <CommandExecution
              command={command.command}
              copyCommandLabel="Copy"
              cwd={command.cwd}
              data-item-id={command.id}
              data-testid="command-execution"
              defaultOpen={false}
              durationMs={command.durationMs ?? undefined}
              exitCode={command.exitCode ?? undefined}
              status={command.status}
              terminalIcon={
                <CurrentBuildIcon name="thread-command-terminal" />
              }
            >
              <CommandOutput copyLabel="Copy" copyText={command.output}>
                {command.output}
              </CommandOutput>
            </CommandExecution>
          </ActivityTimeline>
        );
      }
      if (
        isCurrentCommandInterruptionReplay &&
        command.id === "command-interruption"
      ) {
        const commandSummary = (
          <span className="codex-ui-command-execution__summary-command">
            {command.command}
          </span>
        );
        const running =
          command.status === "running" && state.status === "running";
        const stopped =
          state.status === "interrupted" || command.status === "completed";
        const execution = (
          <CommandExecution
            command={command.command}
            data-item-id={command.id}
            data-testid="command-execution"
            hideRawCommand
            indicator={
              stopped ? (
                <span
                  aria-hidden="true"
                  className="demo-command-stop-indicator"
                />
              ) : undefined
            }
            open={false}
            status={stopped ? "interrupted" : "running"}
            terminalIcon={
              <CurrentBuildIcon name="thread-command-terminal" />
            }
            summary={
              stopped ? (
                <>Background terminal stopped with {commandSummary}</>
              ) : (
                <>Running {commandSummary}</>
              )
            }
          />
        );
        return running ? (
          <ActivityTimeline
            key={`command:${command.id}`}
            open
            summary={<TurnDuration durationMs={7_000} status="working" />}
          >
            {execution}
          </ActivityTimeline>
        ) : (
          <Fragment key={`command:${command.id}`}>{execution}</Fragment>
        );
      }
      return (
        <CommandExecution
          command={command.command}
          cwd={command.cwd}
          data-item-id={command.id}
          data-testid="command-execution"
          durationMs={command.durationMs ?? undefined}
          detail={
            command.processId ? (
              <button
                className="demo-command-terminal"
                onClick={() => {
                  setTerminalSessionIds((sessionIds) =>
                    sessionIds.includes(command.id)
                      ? sessionIds
                      : [...sessionIds, command.id],
                  );
                  setClosedTerminalSessionIds((sessionIds) =>
                    sessionIds.filter((id) => id !== command.id),
                  );
                  setTerminalCommandId(command.id);
                  setTerminalOpen(true);
                }}
                type="button"
              >
                Open terminal
              </button>
            ) : undefined
          }
          exitCode={command.exitCode ?? undefined}
          key={`command:${command.id}`}
          open={
            initialSelection.capture
              ? activeFrame === "command-running" &&
                command.status === "running"
              : undefined
          }
          status={command.status}
        >
          <CommandOutput copyText={command.output}>
            {command.output}
          </CommandOutput>
        </CommandExecution>
      );
    }

    if (entry.kind === "approval") {
      const approval = state.approvals.find(
        ({ requestId }) =>
          `${typeof requestId}:${requestId}` === entry.id,
      );
      if (!approval) return null;
      if (
        isCurrentApprovalReplay ||
        (isCurrentMixedToolReplay && approval.decision !== "pending")
      ) {
        return null;
      }
      return (
        <ApprovalRequest
          data-item-id={approval.itemId}
          data-testid="approval-request"
          decision={approval.decision}
          description={approval.command}
          kind={approval.kind}
          key={`approval:${entry.id}`}
          onApprove={() =>
            respondToApproval(approval.requestId, "accept")
          }
          onReject={() =>
            respondToApproval(approval.requestId, "decline")
          }
          reason={approval.reason}
          scopedApproveAction={
            approval.kind === "file"
              ? {
                  info: "Allow this and future file edits in this conversation without asking again",
                  label: "Allow all edits",
                  onClick: () =>
                    respondToApproval(
                      approval.requestId,
                      "acceptForSession",
                    ),
                }
              : undefined
          }
          title={
            approval.kind === "command"
              ? "Run this command?"
              : "Apply these file changes?"
          }
        />
      );
    }

    const fileChange = state.fileChanges.find(({ id }) => id === entry.id);
    if (!fileChange || undoneFileIds.has(fileChange.id)) return null;
    if (
      isCurrentApproval26820FileReplay &&
      fileChange.id.startsWith("file-approval-current-26-820-")
    ) {
      const pending = fileChange.status === "streaming";
      const allowed = fileChange.id.endsWith("allowed");
      return (
        <div
          className="demo-current-26-820-file-approval__duration"
          key={`file-change:${fileChange.id}`}
        >
          <TurnDuration
            durationMs={
              pending ? (allowed ? 25_000 : 109_000) : allowed ? 26_000 : 130_000
            }
            status={pending ? "working" : "worked"}
          />
        </div>
      );
    }
    const changes = isCurrentReview26825FilesReplay
      ? [
          {
            additions: 3,
            change: "modified" as const,
            deletions: 3,
            path: "research/current-review-26-825-probe/alpha.txt",
          },
          {
            additions: 0,
            change: "deleted" as const,
            deletions: 2,
            path: "research/current-review-26-825-probe/obsolete.txt",
          },
          {
            additions: 2,
            change: "added" as const,
            deletions: 0,
            path: "research/current-review-26-825-probe/added.txt",
          },
        ]
      : fileChange.changes.map((change) => {
          const stats = changeStats(change);
          return {
            additions: stats.additions,
            change: change.kind,
            deletions: stats.deletions,
            path: change.path,
            previousPath: change.previousPath,
          };
        });
    const currentReviewReverted = revertedCurrentReviewIds.has(fileChange.id);
    const indicator = isCurrentReviewProductReplay ? (
      isCurrentReview26825FilesReplay ? (
        <CurrentBuildIcon name="review-card-files" />
      ) : (
        <CurrentBuildIcon name="review-file-text" />
      )
    ) : (
      <svg
        aria-hidden="true"
        className="demo-file-indicator"
        viewBox="0 0 16 16"
      >
        <rect height="12" rx="2" width="12" x="2" y="2" />
        <path d="M5 8h6M8 5v6" />
      </svg>
    );
    const detail =
      fileChange.status === "applied" ? (
        <span className="demo-file-actions">
          {mode === "replay" ? (
            <button
              onClick={() => {
                if (isCurrentReviewProductReplay) {
                  if (currentReviewReverted) {
                    setRevertedCurrentReviewIds((current) => {
                      const next = new Set(current);
                      next.delete(fileChange.id);
                      return next;
                    });
                    setCurrentReviewConflictArmed(true);
                    return;
                  }
                  if (currentReviewConflictArmed) {
                    setFileRevertErrorOpen(true);
                    return;
                  }
                  setRevertedCurrentReviewIds((current) =>
                    new Set(current).add(fileChange.id),
                  );
                  if (resolvedReview?.fileChangeId === fileChange.id) {
                    setReviewOpen(false);
                    setReviewSelection(null);
                  }
                  return;
                }
                setUndoneFileIds((current) => {
                  const next = new Set(current);
                  next.add(fileChange.id);
                  return next;
                });
                if (resolvedReview?.fileChangeId === fileChange.id) {
                  setReviewOpen(false);
                  setReviewSelection(null);
                }
              }}
              type="button"
            >
              {currentReviewReverted ? "Reapply" : "Undo"}{" "}
              {isCurrentReview26825FilesReplay ? (
                <CurrentBuildIcon name="review-undo" />
              ) : (
                <span aria-hidden="true">↶</span>
              )}
            </button>
          ) : null}
          <button
            onClick={() => {
              setReviewSelectionKey((current) => current + 1);
              setReviewSelection({
                fileChangeId: fileChange.id,
              });
              openReviewPanel();
            }}
            type="button"
          >
            Review
          </button>
        </span>
      ) : undefined;
    return (
      <Fragment key={`file-change:${fileChange.id}`}>
        <FileChangeGroup
          changes={changes}
          data-item-id={fileChange.id}
          data-testid="file-change-group"
          description={
            isCurrentReviewProductReplay ? (
              isCurrentReview26825FilesReplay &&
              reviewOpen &&
              resolvedReview?.fileChangeId === fileChange.id ? (
                <span className="demo-current-review-card-link">
                  Review changes <span aria-hidden="true">↗</span>
                </span>
              ) : (
                <span className="demo-current-review-card-stats">
                  <span data-stat="additions">+{reviewTotals.additions}</span>
                  <span data-stat="deletions">−{reviewTotals.deletions}</span>
                </span>
              )
            ) : undefined
          }
          detail={detail}
          indicator={indicator}
          onOpenFile={(change) => {
            setReviewSelectionKey((current) => current + 1);
            setReviewSelection({
              fileChangeId: fileChange.id,
              path: change.path,
            });
            openReviewPanel();
          }}
          status={fileChange.status}
        />
        {mode === "replay" &&
        (fileChange.id === "file-multi-file" ||
          fileChange.id === "file-current-review-rename" ||
          fileChange.id === "file-current-review-26-825-files") ? (
          <div
            aria-label="Turn actions"
            className={
              isCurrentReview26825FilesReplay
                ? "demo-turn-actions demo-current-review-26-825-actions"
                : "demo-turn-actions"
            }
            role="toolbar"
          >
            {isCurrentReview26825FilesReplay ? (
              <>
                <button aria-label="Copy" type="button">
                  <CurrentBuildIcon name="thread-assistant-copy" />
                </button>
                <button aria-label="Good response" type="button">
                  <CurrentBuildIcon name="thread-assistant-good" />
                </button>
                <button aria-label="Bad response" type="button">
                  <CurrentBuildIcon name="thread-assistant-bad" />
                </button>
                <button aria-label="Fork chat from here" type="button">
                  <CurrentBuildIcon name="thread-assistant-fork" />
                </button>
              </>
            ) : (
              <>
                <button aria-label="Copy response" type="button">
                  ▣
                </button>
                <button aria-label="Good response" type="button">
                  ♡
                </button>
                <button aria-label="Bad response" type="button">
                  ♢
                </button>
                <button aria-label="Share response" type="button">
                  ↗
                </button>
              </>
            )}
            <time
              dateTime={
                fileChange.id === "file-current-review-rename" ||
                fileChange.id === "file-current-review-26-825-files"
                  ? "00:55"
                  : "14:39"
              }
            >
              {fileChange.id === "file-current-review-26-825-files"
                ? "11:59 PM"
                : fileChange.id === "file-current-review-rename"
                  ? "12:55 AM"
                  : "2:39 PM"}
            </time>
          </div>
        ) : null}
      </Fragment>
    );
  });
  const currentWindowedContent = currentWindowedFrame ? (
    <div
      data-mounted-turn-count={windowedTurnWindowSize}
      data-selected-message-index={windowedSelectedMessageIndex + 1}
      data-total-message-count={windowedHistorySize}
    >
      {currentWindowStart > 0 ? (
        <ThreadVirtualizedPlaceholder
          data-hidden-entry-count={currentWindowStart}
          data-window-side="before"
          estimatedHeight={`${
            currentWindowStart * windowedPlaceholderRem
          }rem`}
        />
      ) : null}
      {Array.from(
        { length: windowedTurnWindowSize },
        (_, offset) => {
          const messageIndex = currentWindowStart + offset;
          return (
            <AgentTurn
              data-windowed-turn={messageIndex + 1}
              key={`current-windowed-turn-${messageIndex + 1}`}
              spacing="grouped"
            >
              <AgentMessage
                data-item-id={`current-windowed-user-${messageIndex + 1}`}
                role="user"
              >
                {current26825LongFrame
                  ? `Do not use tools or modify files. Reply with exactly: LONG THREAD ${String(
                      messageIndex + 1,
                    ).padStart(2, "0")}.`
                  : `Synthetic user checkpoint ${messageIndex + 1}`}
              </AgentMessage>
              <AgentMessage role="assistant">
                {current26825LongFrame
                  ? `LONG THREAD ${String(messageIndex + 1).padStart(2, "0")}.`
                  : "The host keeps only the nearby deterministic turn window mounted."}
              </AgentMessage>
            </AgentTurn>
          );
        },
      )}
      {currentWindowEnd < windowedHistorySize ? (
        <ThreadVirtualizedPlaceholder
          data-hidden-entry-count={
            windowedHistorySize - currentWindowEnd
          }
          data-window-side="after"
          estimatedHeight={`${
            (windowedHistorySize - currentWindowEnd) *
            windowedPlaceholderRem
          }rem`}
        />
      ) : null}
    </div>
  ) : null;
  const activeTurnHasWork = hasActiveTurnWork(state);
  const terminalCommands = useMemo(
    () => state.commands.filter(({ processId }) => Boolean(processId)),
    [state.commands],
  );
  const visibleTerminalSessionIds = terminalSessionIds.filter(
    (id) =>
      id.startsWith("local-terminal-") ||
      terminalCommands.some((command) => command.id === id),
  );
  const activeTerminalSessionId =
    visibleTerminalSessionIds.includes(terminalCommandId ?? "")
      ? (terminalCommandId ?? "")
      : (visibleTerminalSessionIds.at(-1) ?? "");
  const terminalEntriesBySession = useMemo(() => {
    const entriesBySession: Record<string, TerminalEntry[]> = {};
    for (const sessionId of terminalSessionIds) {
      const terminalCommand = terminalCommands.find(
        ({ id }) => id === sessionId,
      );
      const terminalHistory =
        terminalHistoryByCommand[sessionId] ?? [];
      if (!terminalCommand) {
        entriesBySession[sessionId] = terminalHistory;
        continue;
      }
      const protocolEntries =
        terminalCommand.terminalEvents.length > 0
          ? terminalTranscriptEvents(terminalCommand.terminalEvents).map(
              (entry, index) => ({
                id: `${terminalCommand.id}:event:${index}`,
                kind:
                  entry.kind === "stdin"
                    ? ("command" as const)
                    : ("stdout" as const),
                text: entry.text.replace(/\n$/, ""),
              }),
            )
          : [
              ...(terminalCommand.output
                ? [
                    {
                      id: `${terminalCommand.id}:output`,
                      kind: "stdout" as const,
                      text: terminalCommand.output.replace(/\n$/, ""),
                    },
                  ]
                : []),
              ...(terminalCommand.terminalInput
                ? [
                    {
                      id: `${terminalCommand.id}:stdin`,
                      kind: "command" as const,
                      text: terminalCommand.terminalInput.replace(
                        /\n$/,
                        "",
                      ),
                    },
                  ]
                : []),
            ];
      entriesBySession[sessionId] = [
        {
          id: `${terminalCommand.id}:command`,
          kind: "command",
          text: `${terminalCommand.cwd} % ${terminalCommand.command}`,
        },
        ...protocolEntries,
        ...terminalHistory,
      ];
    }
    return entriesBySession;
  }, [
    terminalCommands,
    terminalHistoryByCommand,
    terminalSessionIds,
  ]);
  const terminalSessions = visibleTerminalSessionIds.map(
    (sessionId, visibleIndex) => {
      const terminalCommand = terminalCommands.find(
        ({ id }) => id === sessionId,
      );
      const sessionProjectLabel =
        terminalWorkspaceBySession[sessionId] ??
        workspaceRunProjectLabel;
      const label =
        visibleTerminalSessionIds.length > 1
          ? `${sessionProjectLabel} ${visibleIndex + 1}`
          : sessionProjectLabel;
      const mismatched =
        sessionId === activeTerminalSessionId &&
        sessionProjectLabel !== workspaceRunProjectLabel &&
        !dismissedTerminalMismatchIds.has(sessionId);
      const isDirectShellReload =
        activeFrame === "terminal-current-reload" &&
        sessionId === terminalReloadSessionId &&
        !terminalReloadPendingIds.has(sessionId);
      const isBackgroundTerminal =
        sessionId === "agent-background-terminal";
      return {
        entries: terminalEntriesBySession[sessionId]!,
        id: sessionId,
        icon: currentTerminal26825Frame(activeFrame) ? (
          <CurrentBuildIcon name="thread-command-terminal" />
        ) : undefined,
        inputDisabled:
          activeFrame === "terminal-current-running" &&
          sessionId === activeTerminalSessionId,
        label,
        notice: mismatched ? (
          <TerminalWorkspaceMismatchNotice
            onDismiss={() =>
              setDismissedTerminalMismatchIds((sessionIds) => {
                const next = new Set(sessionIds);
                next.add(sessionId);
                return next;
              })
            }
            onOpenNewTerminal={() => createTerminalSession()}
          />
        ) : undefined,
        onReload: isDirectShellReload
          ? () => {
              cancelTerminalReloadTimer();
              setTerminalReloadPendingIds((sessionIds) =>
                new Set(sessionIds).add(sessionId),
              );
              terminalReloadTimerRef.current = window.setTimeout(() => {
                terminalReloadTimerRef.current = null;
                setTerminalReloadPendingIds((sessionIds) => {
                  const next = new Set(sessionIds);
                  next.delete(sessionId);
                  return next;
                });
                setTerminalReloadSessionId(null);
                setActiveFrame("terminal-current-single");
              }, 160);
            }
          : undefined,
        showStatus:
          !sessionId.startsWith("local-terminal-") &&
          !isBackgroundTerminal,
        status:
          terminalReloadPendingIds.has(sessionId)
            ? ("restoring" as const)
            : isDirectShellReload
              ? ("failed" as const)
              : isBackgroundTerminal
                ? ("running" as const)
                : terminalCommand?.status === "running"
            ? ("running" as const)
            : terminalCommand?.status === "failed"
              ? ("failed" as const)
              : terminalCommand?.status === "completed"
                ? ("exited" as const)
                : ("idle" as const),
        value: terminalValuesByCommand[sessionId] ?? "",
      };
    },
  );
  const createTerminalSession = () => {
    const sessionId = `local-terminal-${terminalSessionCounterRef.current}`;
    terminalSessionCounterRef.current += 1;
    setTerminalSessionIds((sessionIds) => [
      ...sessionIds,
      sessionId,
    ]);
    setTerminalWorkspaceBySession((labels) => ({
      ...labels,
      [sessionId]: workspaceRunProjectLabel,
    }));
    setTerminalCommandId(sessionId);
    setTerminalOpen(true);
    setTerminalTabPickerOpen(false);
  };
  function toggleTerminalPanel() {
    if (terminalOpen) {
      setTerminalOpen(false);
      return;
    }
    if (visibleTerminalSessionIds.length === 0) {
      createTerminalSession();
      return;
    }
    setTerminalOpen(true);
  }
  const terminalPanel = (
    <TerminalPanel
      activeSessionId={activeTerminalSessionId}
      className="demo-terminal-panel"
      closeIcon={
        currentTerminal26825Frame(activeFrame) ? (
          <CurrentBuildIcon name="review-close" />
        ) : undefined
      }
      data-testid="terminal-panel"
      label="Terminal"
      onActiveSessionChange={setTerminalCommandId}
      onClose={() => setTerminalOpen(false)}
      onCloseSession={(sessionId) => {
        setTerminalSessionIds((sessionIds) => {
          const closingIndex = sessionIds.indexOf(sessionId);
          const remaining = sessionIds.filter((id) => id !== sessionId);
          if (terminalCommandId === sessionId) {
            setTerminalCommandId(
              remaining[
                Math.min(
                  Math.max(closingIndex, 0),
                  remaining.length - 1,
                )
              ] ?? null,
            );
          }
          if (remaining.length === 0) setTerminalOpen(false);
          return remaining;
        });
        setClosedTerminalSessionIds((sessionIds) => [
          ...sessionIds.filter((id) => id !== sessionId),
          sessionId,
        ]);
        setDismissedTerminalMismatchIds((sessionIds) => {
          const next = new Set(sessionIds);
          next.delete(sessionId);
          return next;
        });
      }}
      onCommandSubmit={(sessionId, command) => {
        const terminalCommand = terminalCommands.find(
          ({ id }) => id === sessionId,
        );
        setTerminalHistoryByCommand((historyByCommand) => {
          const entries = historyByCommand[sessionId] ?? [];
          return {
            ...historyByCommand,
            [sessionId]: [
              ...entries,
              {
                id: `${sessionId}:local:${entries.length}:command`,
                kind: "command",
                text: `${terminalCommand?.cwd ?? workspaceRunCwd} % ${command}`,
              },
              {
                id: `${sessionId}:local:${entries.length}:system`,
                kind: "system",
                text: "Replay input is host-owned and was not executed.",
              },
            ],
          };
        });
        setTerminalValuesByCommand((values) => ({
          ...values,
          [sessionId]: "",
        }));
      }}
      onCreateSession={createTerminalSession}
      onSessionValueChange={(sessionId, value) =>
        setTerminalValuesByCommand((values) => ({
          ...values,
          [sessionId]: value,
        }))
      }
      openSessionAction={
        <Menu
          align="start"
          className="demo-terminal-tab-menu"
          label="Open bottom panel tab"
          onOpenChange={setTerminalTabPickerOpen}
          open={terminalTabPickerOpen}
          side="bottom"
          sideOffset={
            currentTerminal26825Frame(activeFrame) ? 2 : 4
          }
          trigger={
            <IconButton
              icon="+"
              label="Open bottom panel tab"
              size="toolbar"
            />
          }
          width="auto"
        >
          <MenuItem
            disabled={!reviewPanel}
            endIcon="⌃⇧G"
            onSelect={() => {
              openReviewPanel();
              setTerminalTabPickerOpen(false);
            }}
            startIcon={
              currentTerminal26825Frame(activeFrame) ? (
                <CurrentBuildIcon name="review-tab" />
              ) : (
                "▣"
              )
            }
          >
            Review
          </MenuItem>
          <MenuItem
            onSelect={createTerminalSession}
            startIcon={
              currentTerminal26825Frame(activeFrame) ? (
                <CurrentBuildIcon name="thread-command-terminal" />
              ) : (
                "▣"
              )
            }
          >
            Terminal
          </MenuItem>
          <MenuItem
            disabled
            endIcon="⌘T"
            startIcon={
              currentTerminal26825Frame(activeFrame) ? (
                <CurrentBuildIcon name="settings-browser" />
              ) : (
                "◎"
              )
            }
          >
            Browser
          </MenuItem>
          <MenuItem
            disabled
            endIcon="⌘P"
            startIcon={
              currentTerminal26825Frame(activeFrame) ? (
                <CurrentBuildIcon name="review-file-text" />
              ) : (
                "□"
              )
            }
          >
            Files
          </MenuItem>
        </Menu>
      }
      sessions={terminalSessions}
    />
  );
  const backgroundTerminalCommand =
    "for i in $(seq 1 120); do printf 'terminal-background-handle-%03d\\n' \"$i\"; sleep 1; done";
  const backgroundTerminalPanelSelected =
    view === "conversation" &&
    scenarioId === "terminal-lifecycle" &&
    (activeFrame === "terminal-current-background-list" ||
      activeFrame === "terminal-current-background-open");
  const openBackgroundTerminal = () => {
    setTerminalSessionIds(["agent-background-terminal"]);
    setTerminalWorkspaceBySession({
      "agent-background-terminal": "codex-ui-kit",
    });
    setTerminalHistoryByCommand(
      initialTerminalHistory(
        "terminal-lifecycle",
        "terminal-current-background-open",
      ),
    );
    setTerminalCommandId("agent-background-terminal");
    setTerminalOpen(false);
    setBackgroundTerminalPanelOpen(true);
    setActiveFrame("terminal-current-background-open");
  };
  const closeBackgroundTerminalTab = () => {
    setTerminalSessionIds([]);
    setTerminalCommandId(null);
    setTerminalOpen(false);
    setActiveFrame("terminal-current-background-list");
  };
  const backgroundTerminalSidePanel =
    activeFrame === "terminal-current-background-open" ? (
      <WorkspacePanel
        activeTabId="agent-background-terminal"
        className="demo-background-terminal-panel"
        data-testid="terminal-current-background-panel"
        label="Background terminal"
        onActiveTabChange={() => undefined}
        onClose={() => closeBackgroundTerminalTab()}
        onCloseTab={() => closeBackgroundTerminalTab()}
        placement="side"
        tabCloseButtons
        tabs={[
          {
            closeLabel: `Close ${backgroundTerminalCommand} tab`,
            content: (
              <TerminalTranscript
                entries={
                  terminalEntriesBySession["agent-background-terminal"] ?? []
                }
                label="Background terminal output"
              />
            ),
            id: "agent-background-terminal",
            label: backgroundTerminalCommand,
          },
        ]}
      />
    ) : (
      <div
        className="demo-background-terminal-summary"
        data-testid="terminal-current-background-summary"
      >
        <TerminalProcessList
          label="Background processes"
          onOpenProcess={openBackgroundTerminal}
          onStopAll={() => setBackgroundTerminalRunning(false)}
          processes={
            backgroundTerminalRunning
              ? [
                  {
                    id: "agent-background-terminal",
                    label: backgroundTerminalCommand,
                    status: "running",
                    view: "background",
                  },
                ]
              : []
          }
        />
      </div>
    );
  const messageNavigation = isConversationLifecycle ? (
    <ThreadMessageNavigationRail
      activeIds={
        currentWindowedFrame
          ? [
              `current-windowed-user-${
                current26825LongFrame
                  ? Math.max(1, windowedSelectedMessageIndex - 3)
                  : windowedSelectedMessageIndex + 1
              }`,
            ]
          : undefined
      }
      density={currentWindowedFrame ? "compact" : "regular"}
      initialScroll={currentWindowedFrame ? "end" : "start"}
      items={messageNavigationItems}
      minItems={current26825LongFrame ? 4 : 10}
      onNavigate={(item, behavior) => {
        if (currentWindowedFrame) {
          const nextIndex =
            Number(item.id.replace("current-windowed-user-", "")) - 1;
          if (
            Number.isInteger(nextIndex) &&
            nextIndex >= 0 &&
            nextIndex < windowedHistorySize
          ) {
            setWindowedSelectedMessageIndex(nextIndex);
            setThreadFollowing(
              nextIndex === windowedHistorySize - 1,
            );
          }
          return;
        }
        if (scrollToMessage(item.id, behavior)) return;
      }}
    />
  ) : undefined;
  const floatingControl =
    isConversationLifecycle ||
    (mode === "replay" && scenarioId === "markdown-streaming-large") ? (
      <ThreadFloatingButton
        onClick={returnToLatest}
        show={!threadFollowing}
        working={composerIsRunning}
      />
    ) : undefined;

  return (
    <div
      className="demo-root"
      data-capture={initialSelection.capture || undefined}
      data-frame={activeFrame ?? lastEvent?.frame ?? "final"}
      data-layout={initialSelection.layoutMode}
      data-last-method={state.lastMethod ?? undefined}
      data-mode={mode}
      data-composer-phase={
        currentComposerQueue26825Replay
          ? currentQueue26825Phase === "paused"
            ? "queue-paused"
            : currentQueue26825Phase === "resume-ready"
              ? "resume-ready"
              : currentQueue26825Phase === "continued"
                ? "continued"
                : currentQueue26825Running
                  ? "queued"
                  : "idle"
        : isConversationLifecycle ||
        isCurrentAttachmentReplay ||
        isCurrentCommandInterruptionReplay ||
        isCurrentCommandReplay ||
        isCurrentContextCompactionReplay ||
        isCurrentSubagentReplay
          ? composerPhase
          : undefined
      }
      data-composer-overlay={
        isConversationLifecycle ||
        isCurrentAttachmentReplay ||
        currentComposerControls26825Replay
          ? composerOverlay ?? undefined
          : undefined
      }
      data-composer-mode={
        isConversationLifecycle || currentComposerControls26825Replay
          ? composerMode ?? undefined
          : undefined
      }
      data-queue-count={
        isConversationLifecycle || currentComposerQueue26825Replay
          ? queuedPrompts.length
          : undefined
      }
      data-queueing-enabled={
        isConversationLifecycle || currentComposerQueue26825Replay
          ? queueingEnabled
          : undefined
      }
      data-scenario={scenarioId}
      data-sidebar-current={currentSidebarComposition || undefined}
      data-sidebar-state={initialSelection.sidebarState ?? undefined}
      data-summary-open={
        isCurrentCitations26825Replay
          ? citationSummaryOpen
          : isCurrentMcp26818Replay || usesCurrentMcpFlatRows
          ? mcpSourceSummaryOpen
          : undefined
      }
      data-summary-pinned={
        isCurrentMcp26818Replay || usesCurrentMcpFlatRows
          ? mcpSourceSummaryPinned
          : undefined
      }
      data-status={
        currentComposerQueue26825Replay
          ? currentQueue26825Running
            ? "running"
            : currentQueue26825Phase === "paused" ||
                currentQueue26825Phase === "resume-ready"
              ? "interrupted"
              : "completed"
          : displayedStatus
      }
      data-theme={appliedTheme}
      data-thread-following={
        isConversationLifecycle ? threadFollowing : undefined
      }
      data-windowed-timeline={
        currentWindowedFrame
          ? current26825LongFrame
            ? "current-26-825"
            : "current"
          : undefined
      }
      data-shell-state={view === "shell" ? shellState : undefined}
      data-app-server-state={appServerCrashed ? "crashed" : "running"}
      data-notification-action={shellNotificationAction ?? undefined}
      data-current-home={currentHomeFrame || undefined}
      data-current-context-26-825={
        currentContext26825Replay || undefined
      }
      data-current-composer-controls-26-825={
        currentComposerControls26825Replay || undefined
      }
      data-route-history-index={routeHistory.index}
      data-route-history-length={routeHistory.entries.length}
      data-view={view}
    >
      {!initialSelection.capture && themeAvailable ? (
        <label className="demo-theme-control demo-theme-control--floating">
          <span>Theme</span>
          <select
            aria-label="Theme"
            onChange={(event) =>
              setTheme(
                parseDemoThemePreference(event.currentTarget.value),
              )
            }
            value={theme}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      ) : null}
      <ImagePreviewDialog
        closeLabel="Close image preview"
        downloadLabel="Download image"
        imageId={attachmentPreviewImage?.id}
        images={
          attachmentPreviewImage?.previewSrc
            ? [
                {
                  alt: attachmentPreviewImage.label,
                  downloadSrc: attachmentPreviewImage.previewSrc,
                  id: attachmentPreviewImage.id,
                  src: attachmentPreviewImage.previewSrc,
                },
              ]
            : []
        }
        onOpenChange={(open) => {
          if (!open) setAttachmentPreviewId(null);
        }}
        open={Boolean(attachmentPreviewImage?.previewSrc)}
        presentation="immersive"
        title="Image preview"
      />
      <AppNotificationRegion
        notifications={
          view === "shell"
            ? [
                ...(shellNotificationVisible
                  ? [
                      {
                        description: "Pull requests are up to date.",
                        heading: "Connection restored",
                        id: "shell-restored",
                        onDismiss: () => setShellNotificationVisible(false),
                        tone: "info" as const,
                      },
                    ]
                  : []),
                ...shellQueuedNotificationIds.map((id) => {
                  const remove = () =>
                    setShellQueuedNotificationIds((current) =>
                      current.filter((candidate) => candidate !== id),
                    );
                  if (id === "success" || id.startsWith("success-")) {
                    return {
                      heading: "Chat unpinned",
                      id,
                      onDismiss: remove,
                      tone: "success" as const,
                    };
                  }
                  if (id === "permission") {
                    return {
                      actionLabel: "Review",
                      description: "A local command is waiting for approval.",
                      heading: "Permission required",
                      id,
                      onAction: () => {
                        setShellNotificationAction("permission-reviewed");
                        remove();
                      },
                      onDismiss: remove,
                      tone: "warning" as const,
                    };
                  }
                  if (id === "background") {
                    return {
                      actionLabel: "Open",
                      description: "The validation task finished successfully.",
                      heading: "Background task completed",
                      id,
                      onAction: () => {
                        setShellNotificationAction("background-opened");
                        remove();
                      },
                      onDismiss: remove,
                      tone: "info" as const,
                    };
                  }
                  if (id === "restored") {
                    return {
                      description: "Live updates are available again.",
                      heading: "Connection restored",
                      id,
                      onDismiss: remove,
                      tone: "info" as const,
                    };
                  }
                  return {
                    actionLabel: "View",
                    description: "Restart when your current work is saved.",
                    heading: "Update available",
                    id,
                    onAction: () => {
                      setShellNotificationAction("update-viewed");
                      remove();
                    },
                    onDismiss: remove,
                    tone: "neutral" as const,
                  };
                }),
              ]
            : []
        }
        style={
          initialSelection.frame === "shell-notification-queue" ||
          initialSelection.frame === "shell-notification-success-stack"
            ? ({
                "--codex-ui-app-sidebar-width": "322.90625px",
              } as CSSProperties)
            : undefined
        }
      />
      {appServerCrashed ? (
        <AppServerCrashRecovery
          configurationAction={{
            label: "Open Config.toml",
            onClick: () => setShellNotificationAction("configuration-opened"),
          }}
          documentationAction={{
            label: "documentation",
            onClick: () => setShellNotificationAction("documentation-opened"),
          }}
          restartAction={{
            label: "Restart",
            onClick: () => {
              setAppServerCrashed(false);
              setActiveFrame("app-server-restarted");
            },
          }}
          updateAction={{
            label: "Update ChatGPT",
            onClick: () => setShellNotificationAction("update-opened"),
          }}
        />
      ) : (
      <AppShell
        bottomPanel={terminalPanel}
        bottomPanelHeight={terminalHeight}
        bottomPanelLabel="Terminal"
        bottomPanelOpen={terminalOpen}
        bottomPanelResizable
        bottomPanelResizeLabel="Resize bottom panel"
        onBottomPanelHeightChange={setTerminalHeight}
        layoutMode={
          (initialSelection.capture &&
            initialSelection.layoutMode !== "narrow" &&
            activeFrame !== "pr-compact-detail" &&
            initialSelection.frame !== "route-continuity-projects" &&
            activeFrame !== "subagent-current-compact-720" &&
            ![
              "compact-collapsed",
              "compact-pinned",
            ].includes(initialSelection.sidebarState ?? "")) ||
          initialSelection.layoutMode === "wide"
            ? "wide"
            : undefined
        }
        mainLabel={
          workspaceShowsSettings ? "Settings route" : undefined
        }
        mainRole={workspaceShowsSettings ? "region" : "main"}
        narrowSidebarBehavior="current-build"
        onSidebarOpenChange={setSidebarOpen}
        onSidePanelOpenChange={
          view === "pull-request"
            ? setPullRequestOpen
            : isCurrentCitations26825Replay
              ? setCitationSourcesOpen
            : isCurrentBrowser26825Replay
              ? setBrowserPanelOpen
            : backgroundTerminalPanelSelected
              ? setBackgroundTerminalPanelOpen
            : subagentPanelSelected
              ? setSubagentPanelOpen
              : setReviewOpen
        }
        onSidePanelWidthChange={
          view === "pull-request"
            ? setPullRequestWidth
            : isCurrentCitations26825Replay
              ? setCitationSourcesWidth
            : isCurrentBrowser26825Replay
              ? setBrowserPanelWidth
            : backgroundTerminalPanelSelected
              ? setBackgroundTerminalPanelWidth
            : subagentPanelSelected
              ? setSubagentPanelWidth
              : setReviewPanelWidth
        }
        responsivePanelContinuity={
          !initialSelection.capture &&
          activeFrame !== "pr-compact-detail"
        }
        responsivePanelContinuityKey={`${mode}:${view}:${scenarioId}`}
        responsiveSidebarContinuity={false}
        sidePanel={
          view === "pull-request"
            ? isCurrentPullRequestRouteReplay
              ? isCurrentPullRequestReviewReplay
                ? pullRequestPanel
                : currentPullRequestEmptyPanel
              : pullRequestPanel
            : isCurrentCitations26825Replay
              ? citationSourcesPanel
            : isCurrentBrowser26825Replay
              ? browserWorkspacePanel
            : backgroundTerminalPanelSelected
              ? backgroundTerminalSidePanel
            : subagentPanelSelected
              ? subagentPanel
              : reviewPanel
        }
        sidePanelExpanded={
          view === "pull-request" && pullRequestExpanded
        }
        sidePanelLabel={
          view === "pull-request"
            ? "Pull request details"
            : isCurrentCitations26825Replay
              ? "Sources"
            : isCurrentBrowser26825Replay
              ? "Browser"
            : backgroundTerminalPanelSelected
              ? activeFrame === "terminal-current-background-open"
                ? "Background terminal"
                : "Thread summary"
            : subagentPanelSelected
              ? "Subagents"
              : "Review"
        }
        sidePanelMinMainWidth={
          view === "pull-request"
            ? 390
            : isCurrentCitations26825Replay
              ? 374.328125
            : isCurrentBrowser26825Replay
              ? 405.53125
            : backgroundTerminalPanelSelected
              ? 390
            : subagentPanelSelected
              ? 220
              : isCurrentReviewProductReplay
                ? 374.328125
                : undefined
        }
        sidePanelMinWidth={
          view === "pull-request"
            ? 322
            : isCurrentCitations26825Replay
              ? 320
            : isCurrentBrowser26825Replay
              ? 320
            : backgroundTerminalPanelSelected
              ? 300
            : subagentPanelSelected
              ? 300
              : undefined
        }
        sidePanelOpen={
          view === "pull-request"
            ? pullRequestOpen
            : isCurrentCitations26825Replay
              ? citationSourcesOpen
            : isCurrentBrowser26825Replay
              ? browserPanelOpen
            : backgroundTerminalPanelSelected
              ? backgroundTerminalPanelOpen
            : subagentPanelSelected
              ? subagentPanelOpen
              : reviewOpen && Boolean(reviewPanel)
        }
        sidePanelOverlay={
          view === "pull-request" && !isCurrentPullRequestRouteReplay
        }
        sidePanelOverlayModal={
          view !== "pull-request" &&
          !isCurrentCitations26825Replay &&
          !backgroundTerminalPanelSelected &&
          !subagentPanelSelected
        }
        sidePanelResizable
        sidePanelWidth={
          view === "pull-request"
            ? pullRequestWidth
            : isCurrentCitations26825Replay
              ? citationSourcesWidth
            : isCurrentBrowser26825Replay
              ? browserPanelWidth
            : backgroundTerminalPanelSelected
              ? backgroundTerminalPanelWidth
            : subagentPanelSelected
              ? subagentPanelWidth
              : reviewPanelWidth
        }
        sidebar={sidebar}
        sidebarWidth={
          currentSidebarThreadLifecycle ||
          currentSidebarWorktreeLifecycle ||
          currentContext26825Replay ||
          currentTerminal26825Frame(activeFrame) ||
          isCurrentRichMarkdownStreamingReplay ||
          usesCurrent26825ThreadHeader ||
          isCurrentCitations26825Replay ||
          isCurrentPullRequestRouteReplay
            ? activeFrame === "terminal-current-26-825-compact-sidebar"
              ? 320.265625
              : 321.875
            : currentHomeFrame || usesCurrent322SidebarWidth
              ? 322.90625
              : undefined
        }
        sidebarMinMainWidth={
          subagentPanelSelected
            ? 220
            : currentSidebarComposition
              ? 240
              : undefined
        }
        sidebarOpen={sidebarOpen}
        sidebarResizable
        windowChrome={
          view === "projects" || view === "shell" || view === "workspace" ? (
            view === "workspace" && workspaceShowsSettings ? null : (
            <AppWindowChrome
              backAction={
                view === "workspace" && workspacePage === "environments"
                  ? {
                      icon: <CurrentBuildIcon name="window-chrome-back" />,
                      label: "Back to ChatGPT",
                      onClick: () => {
                        setWorkspacePage("conversation");
                        setActiveFrame(
                          workspaceEnvironmentId === "worktree"
                            ? "workspace-new-worktree"
                            : "workspace-ready",
                        );
                      },
                    }
                  : sidebarOpen
                    ? {
                        disabled: !canMoveDemoRoute(routeHistory, -1),
                        icon: <CurrentBuildIcon name="window-chrome-back" />,
                        label: "Back",
                        onClick: () => navigateRouteHistory(-1),
                      }
                    : undefined
              }
              endActions={
                view === "projects" ? (
                  <Button
                    className="demo-projects-create"
                    disabled={projectCreationStatus === "selecting"}
                    onClick={() => void createProject("projects")}
                    size="small"
                  >
                    {projectCreationStatus === "selecting"
                      ? "Choosing…"
                      : "Create"}
                  </Button>
                ) : undefined
              }
              forwardAction={
                sidebarOpen
                  ? {
                      disabled: !canMoveDemoRoute(routeHistory, 1),
                      icon: <CurrentBuildIcon name="window-chrome-forward" />,
                      label: "Forward",
                      onClick: () => navigateRouteHistory(1),
                    }
                  : undefined
              }
              sidebarAction={{
                "aria-expanded": sidebarOpen,
                icon: <CurrentBuildIcon name="window-chrome-sidebar" />,
                label: sidebarOpen ? "Hide sidebar" : "Show sidebar",
                onClick: () => setSidebarOpen((open) => !open),
              }}
            />
            )
          ) : undefined
        }
      >
        {view === "pull-request" ? (
          pullRequestIndex
        ) : view === "projects" ? (
          projectsRoute
        ) : view === "shell" ? (
          shellRoute
        ) : view === "workspace" ? (
          workspaceRoute
        ) : (
          <>
            <ConversationThreadShell
              aboveComposer={composerPlanProgress}
              composer={composer}
              floatingControl={floatingControl}
              header={header}
              label="Codex client demo conversation"
              messageNavigation={messageNavigation}
              threadWidth="wide"
              viewportProps={{
                defaultFollowing:
                  activeFrame !== "thread-scroll-away" &&
                  activeFrame !== "thread-windowed" &&
                  !current26825LongFrame,
                followKey: state.eventCount,
                latestOrigin: reverseOriginThread ? "start" : "end",
                onFollowingChange: setThreadFollowing,
              }}
              viewportRef={threadViewportRef}
            >
              <AgentTurn
                aria-label="Protocol-backed conversation"
                data-current-windowed-history={
                  currentWindowedFrame || undefined
                }
              >
                {liveError ? (
                  <StatusBanner heading="Live connection failed" tone="error">
                    {liveError}
                  </StatusBanner>
                ) : null}

                {currentWindowedContent}
                {currentWorktreeSetup ? (
                  <>
                    <AgentMessage role="user">
                      Reply with exactly WORKTREE CARD FAILURE PROBE. Do not use
                      tools or inspect files.
                    </AgentMessage>
                    <WorktreeSetupStatus
                      cancelAction={
                        currentWorktreeSetupPhase === "creating"
                          ? {
                              label: "Cancel",
                              onClick: () => {
                                clearCurrentWorktreeSetupTimers();
                                setCurrentWorktreeSetupPhase("failed");
                                setCurrentWorktreeSetupExpanded(true);
                              },
                            }
                          : undefined
                      }
                      className="demo-current-worktree-setup"
                      data-current-worktree-setup-fixture={
                        currentWorktreeSetupPhase
                      }
                      details={currentWorktreeSetupFailureLog}
                      editEnvironmentAction={
                        currentWorktreeSetupPhase === "failed"
                          ? {
                              label: "Edit environment",
                              onClick: () => {
                                setMode("replay");
                                setView("workspace");
                                setWorkspacePage("environments");
                                setActiveFrame(
                                  "workspace-environments-unavailable",
                                );
                              },
                            }
                          : undefined
                      }
                      expanded={currentWorktreeSetupExpanded}
                      onExpandedChange={setCurrentWorktreeSetupExpanded}
                      phase={currentWorktreeSetupPhase}
                      retryAction={
                        currentWorktreeSetupPhase === "failed"
                          ? {
                              label: "Retry",
                              onClick: retryCurrentWorktreeSetup,
                            }
                          : undefined
                      }
                      steps={currentWorktreeSetupSteps}
                      workLocallyAction={
                        currentWorktreeSetupPhase === "creating"
                          ? {
                              label: "Work locally",
                              onClick: () => {
                                clearCurrentWorktreeSetupTimers();
                                setCurrentWorktreeSetupPhase("created");
                              },
                            }
                          : undefined
                      }
                    />
                  </>
                ) : currentWindowedFrame ? null : (
                  timelineContent
                )}

                {isCurrentPlan26825Replay &&
                state.status === "running" &&
                !state.messages.some(
                  ({ id }) => id === "assistant-current-plan-26-825",
                ) ? (
                  <ActivityTimeline
                    className="demo-current-plan-26-825__duration"
                    data-testid="current-plan-duration"
                    summary={
                      <TurnDuration durationMs={7_000} status="working" />
                    }
                  />
                ) : null}

                {isCurrentReasoning26825Replay &&
                state.status === "running" ? (
                  <ActivityTimeline
                    className="demo-current-reasoning-26-825__duration"
                    data-testid="current-reasoning-duration"
                    summary={
                      <TurnDuration durationMs={19_000} status="working" />
                    }
                  />
                ) : null}

                {isCurrentCommandInterruptionReplay &&
                activeFrame === "command-interruption-stopping" ? (
                  <TerminalProcessList
                    className="demo-terminal-processes"
                    data-testid="command-interruption-process-list"
                    onStopAll={settleCurrentCommandInterruption}
                    onStopProcess={settleCurrentCommandInterruption}
                    processes={[
                      {
                        detail:
                          state.commands.find(
                            ({ id }) => id === "command-interruption",
                          )?.command ?? "Background command",
                        id: "process-command-interruption",
                        label: "Background terminal",
                        status: "running",
                      },
                    ]}
                  />
                ) : null}

                {scenarioId === "terminal-lifecycle" &&
                !currentTerminalFrame(activeFrame) &&
                terminalCommands.length > 0 ? (
                  <TerminalProcessList
                    className="demo-terminal-processes"
                    data-testid="terminal-process-list"
                    onOpenProcess={(sessionId) => {
                      setTerminalSessionIds((sessionIds) =>
                        sessionIds.includes(sessionId)
                          ? sessionIds
                          : [...sessionIds, sessionId],
                      );
                      setClosedTerminalSessionIds((sessionIds) =>
                        sessionIds.filter((id) => id !== sessionId),
                      );
                      setTerminalCommandId(sessionId);
                      setTerminalOpen(true);
                    }}
                    processes={terminalCommands.map((command) => ({
                      detail: command.command,
                      id: command.id,
                      label:
                        command.status === "running"
                          ? "Development process"
                          : command.status === "failed"
                            ? "Failed process"
                            : "Completed process",
                      status:
                        command.status === "completed"
                          ? "exited"
                          : command.status === "pending"
                            ? "idle"
                            : command.status,
                    }))}
                  />
                ) : null}

                {state.status === "running" &&
                !isCurrentContextCompactionReplay &&
                !usesCurrentMcpFlatRows &&
                !activeTurnHasWork &&
                !state.messages.some(
                  ({ role, status, turnId }) =>
                    role === "assistant" &&
                    status === "running" &&
                    turnId === state.currentTurnId,
                ) ? (
                  <ThreadThinkingPlaceholder
                    label={
                      isCurrentReasoning26825Replay
                        ? "Defining evidence categories and priorities"
                        : undefined
                    }
                  />
                ) : null}

              </AgentTurn>
            </ConversationThreadShell>

            {isCurrentMcp26818Replay || usesCurrentMcpFlatRows ? (
              <ThreadSummaryDock
                anchorRef={mcpSourceSummaryTriggerRef}
                className="demo-current-mcp-source-summary-dock"
                onOpenChange={(open) => {
                  if (
                    isCurrentMcp26820Replay &&
                    !open &&
                    !mcpSourceSummaryPinned
                  ) {
                    return;
                  }
                  setMcpSourceSummaryOpen(open);
                }}
                open={mcpSourceSummaryOpen}
                pinned={mcpSourceSummaryPinned}
              >
                <ThreadSummaryPanel
                  className="demo-current-mcp-source-summary-panel"
                  label="MCP sources summary"
                >
                  {isCurrentMcp26825Replay ? (
                    <ThreadSummarySection
                      actions={
                        <ThreadSummaryIconButton
                          icon="+"
                          label="Set up local environment"
                        />
                      }
                      title="Environment"
                    >
                      <ThreadSummaryItem
                        label="Changes"
                        leading={<SummaryGlyph name="changes" />}
                        meta={<ThreadSummaryDelta added={0} removed={0} />}
                      />
                      <ThreadSummaryItem
                        label="Local"
                        leading={<SummaryGlyph name="computer" />}
                        title="Select where to run the chat"
                        trailing="⌄"
                      />
                      <ThreadSummaryItem
                        label="feat/current-mcp-anchor"
                        leading={<SummaryGlyph name="branch" />}
                        title="Switch branch"
                        trailing="⌄"
                      />
                      <ThreadSummaryItem
                        disabled
                        label="Commit or push"
                        leading={<SummaryGlyph name="commit" />}
                      />
                      <ThreadSummaryItem
                        label="Create pull request"
                        leading={<SummaryGlyph name="github" />}
                      />
                    </ThreadSummarySection>
                  ) : (
                    <ThreadSummarySection
                      actions={
                        <ThreadSummaryIconButton
                          icon="+"
                          label="Create a file or site"
                        />
                      }
                      title="Outputs"
                    >
                      <ThreadSummaryItem
                        disabled
                        label="Create a file or site"
                      />
                    </ThreadSummarySection>
                  )}
                  <ThreadSummarySection
                    actions={
                      <ThreadSummaryIconButton
                        icon="+"
                        label={
                          isCurrentMcp26825Replay
                            ? "Attach files or connect apps"
                            : "Add a source"
                        }
                      />
                    }
                    title="Sources"
                  >
                    <ThreadSummaryItem
                      label="openai-docs-mcp"
                      leading={
                        <CurrentBuildIcon name="thread-mcp-tool" />
                      }
                    />
                    <ThreadSummaryItem
                      label="View all"
                      leading={<SummaryGlyph name="link" />}
                      tone="muted"
                    />
                  </ThreadSummarySection>
                </ThreadSummaryPanel>
              </ThreadSummaryDock>
            ) : null}

            {isCurrentCitations26825Replay ? (
              <ThreadSummaryDock
                anchorRef={mcpSourceSummaryTriggerRef}
                className="demo-current-mcp-source-summary-dock demo-current-citations-summary-dock"
                onOpenChange={setCitationSummaryOpen}
                open={citationSummaryOpen}
              >
                <ThreadSummaryPanel
                  className="demo-current-mcp-source-summary-panel demo-current-citations-summary-panel"
                  label="Thread summary"
                >
                  <ThreadSummarySection
                    actions={
                      <ThreadSummaryIconButton
                        icon="+"
                        label="Set up local environment"
                      />
                    }
                    title="Environment"
                  >
                    <ThreadSummaryItem
                      label="Changes"
                      leading={<SummaryGlyph name="changes" />}
                      meta={<ThreadSummaryDelta added={0} removed={0} />}
                    />
                    <ThreadSummaryItem
                      label="Local"
                      leading={<SummaryGlyph name="computer" />}
                      title="Select where to run the chat"
                      trailing="⌄"
                    />
                    <ThreadSummaryItem
                      label="feat/current-citations-sources"
                      leading={<SummaryGlyph name="branch" />}
                      title="Switch branch"
                      trailing="⌄"
                    />
                    <ThreadSummaryItem
                      disabled
                      label="Commit or push"
                      leading={<SummaryGlyph name="commit" />}
                    />
                    <ThreadSummaryItem
                      label="Create pull request"
                      leading={<SummaryGlyph name="github" />}
                    />
                  </ThreadSummarySection>
                  <ThreadSummarySection
                    actions={
                      <ThreadSummaryIconButton
                        icon="+"
                        label="Attach files or connect apps"
                      />
                    }
                    title="Sources"
                  >
                    <ThreadSummaryItem
                      label="Web search"
                      leading={<SummaryGlyph name="link" />}
                    />
                    <ThreadSummaryItem
                      label="View all"
                      leading={<SummaryGlyph name="link" />}
                      onClick={() => {
                        setCitationSourcesOpen(true);
                        if (!isNarrowDemoWindow()) {
                          setCitationSummaryOpen(false);
                        }
                      }}
                      tone="muted"
                    />
                  </ThreadSummarySection>
                </ThreadSummaryPanel>
              </ThreadSummaryDock>
            ) : null}

            {mode === "replay" && !initialSelection.capture ? (
              <div className="demo-playback" aria-label="Replay controls">
                <Button
                  disabled={replayCount <= 1}
                  onClick={() =>
                    selectReplayPosition(Math.max(1, replayCount - 1))
                  }
                  size="small"
                  tone="ghost"
                >
                  Previous
                </Button>
                <input
                  aria-label="Protocol event position"
                  max={scenario.events.length}
                  min={1}
                  onChange={(event) =>
                    selectReplayPosition(Number(event.target.value))
                  }
                  type="range"
                  value={replayCount}
                />
                <Button
                  disabled={replayCount >= scenario.events.length}
                  onClick={() =>
                    selectReplayPosition(
                      Math.min(scenario.events.length, replayCount + 1),
                    )
                  }
                  size="small"
                  tone="ghost"
                >
                  Next
                </Button>
              </div>
            ) : null}
          </>
        )}
      </AppShell>
      )}
      <Dialog
        className="demo-raw-tool-output-dialog"
        description="Arguments and error returned by the integration."
        onOpenChange={(open) => {
          if (!open) setRawToolOutput(null);
        }}
        open={rawToolOutput !== null}
        title={
          rawToolOutput
            ? `${rawToolOutput.name} raw output`
            : "Raw tool call output"
        }
      >
        <pre className="demo-raw-tool-output">
          <code>{JSON.stringify(rawToolOutput?.value, null, 2)}</code>
        </pre>
      </Dialog>
      <FileRevertErrorDialog
        closeIcon={<CurrentBuildIcon name="review-close" />}
        onSelectFile={(path) => {
          const target = state.fileChanges.find(({ changes }) =>
            changes.some((change) => change.path === path),
          );
          if (!target) return;
          setReviewSelectionKey((current) => current + 1);
          setReviewSelection({ fileChangeId: target.id, path });
          setFileRevertErrorOpen(false);
          openReviewPanel();
        }}
        onOpenChange={setFileRevertErrorOpen}
        open={fileRevertErrorOpen}
        skippedFiles={["rename-destination.txt"]}
      />
    </div>
  );
}
