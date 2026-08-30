import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import { launchScene, visualScenes } from "./electron-harness.mjs";

const update = process.argv.includes("--update");
const requestedScenesArgument = process.argv.find((argument) =>
  argument.startsWith("--scenes="),
);
const requestedSceneIds = requestedScenesArgument
  ? new Set(
      requestedScenesArgument
        .slice("--scenes=".length)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    )
  : null;
const selectedScenes = requestedSceneIds
  ? visualScenes.filter(({ id }) => requestedSceneIds.has(id))
  : visualScenes;
if (
  requestedSceneIds &&
  selectedScenes.length !== requestedSceneIds.size
) {
  const knownIds = new Set(visualScenes.map(({ id }) => id));
  const unknownIds = [...requestedSceneIds].filter((id) => !knownIds.has(id));
  throw new Error(`Unknown visual scenes: ${unknownIds.join(", ")}`);
}
const root = process.cwd();
const baselineDirectory = join(root, "tests", "visual", "baselines");
const artifactDirectory = join(root, "artifacts", "visual");
const currentNotificationReference =
  process.env.CODEX_UI_KIT_CURRENT_NOTIFICATION_REFERENCE;
const currentNotificationStackReference =
  process.env.CODEX_UI_KIT_CURRENT_NOTIFICATION_STACK_REFERENCE;
const currentBuildMultiFileReference =
  process.env.CODEX_UI_KIT_MULTI_FILE_REVIEW_REFERENCE;
const currentBuildMultiFileReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildReviewRenameReference =
  process.env.CODEX_UI_KIT_CURRENT_REVIEW_REFERENCE;
const currentBuildReviewRenameReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildPullRequestReference =
  process.env.CODEX_UI_KIT_PULL_REQUEST_REFERENCE;
const currentBuildPullRequestReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildTerminalReference =
  process.env.CODEX_UI_KIT_TERMINAL_REFERENCE;
const currentBuildTerminalReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildMarkdownReference =
  process.env.CODEX_UI_KIT_MARKDOWN_REFERENCE;
const currentBuildMarkdownReferenceSize = {
  height: 820,
  width: 906,
};
const currentMarkdown26818Reference =
  process.env.CODEX_UI_KIT_CURRENT_MARKDOWN_26_818_REFERENCE;
const currentMarkdown26818CompactReference =
  process.env.CODEX_UI_KIT_CURRENT_MARKDOWN_26_818_COMPACT_REFERENCE;
const currentMarkdown26825Reference =
  process.env.CODEX_UI_KIT_CURRENT_MARKDOWN_26_825_REFERENCE;
const currentMarkdownStreamFenceReference =
  process.env.CODEX_UI_KIT_CURRENT_MARKDOWN_STREAM_FENCE_REFERENCE;
const currentMarkdownStreamTableReference =
  process.env.CODEX_UI_KIT_CURRENT_MARKDOWN_STREAM_TABLE_REFERENCE;
const currentMarkdownStreamLongReference =
  process.env.CODEX_UI_KIT_CURRENT_MARKDOWN_STREAM_LONG_REFERENCE;
const currentMarkdownStreamCompleteReference =
  process.env.CODEX_UI_KIT_CURRENT_MARKDOWN_STREAM_COMPLETE_REFERENCE;
const currentBuildMarkdownTablePreviewReference =
  process.env.CODEX_UI_KIT_MARKDOWN_TABLE_PREVIEW_REFERENCE;
const currentBuildMarkdownTablePreviewReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildMcpReference =
  process.env.CODEX_UI_KIT_MCP_TOOL_CALL_REFERENCE;
const currentBuildMcpReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildMcpRecoveryReference =
  process.env.CODEX_UI_KIT_MCP_RECOVERY_REFERENCE;
const currentBuildMcpRecoveryReferenceSize = {
  height: 820,
  width: 906,
};
const currentBasicThreadReference =
  process.env.CODEX_UI_KIT_CURRENT_BASIC_THREAD_REFERENCE;
const currentBasicThreadReferenceSize = {
  height: 774,
  width: 768,
};
const currentBasic26825References = {
  "current-basic-26-825-boundary-open":
    process.env.CODEX_UI_KIT_CURRENT_BASIC_26_825_BOUNDARY_REFERENCE,
  "current-basic-26-825-compact":
    process.env.CODEX_UI_KIT_CURRENT_BASIC_26_825_COMPACT_REFERENCE,
  "current-basic-26-825-wide":
    process.env.CODEX_UI_KIT_CURRENT_BASIC_26_825_WIDE_REFERENCE,
};
const currentCommand26825References = {
  "command-current-26-825-success-compact":
    process.env.CODEX_UI_KIT_CURRENT_COMMAND_26_825_COMPACT_REFERENCE,
  "command-current-26-825-success-completed":
    process.env.CODEX_UI_KIT_CURRENT_COMMAND_26_825_WIDE_REFERENCE,
};
const currentReview26825References = {
  "current-review-26-825-file-card":
    process.env.CODEX_UI_KIT_CURRENT_REVIEW_26_825_CARD_WIDE_REFERENCE,
  "current-review-26-825-file-card-compact":
    process.env.CODEX_UI_KIT_CURRENT_REVIEW_26_825_CARD_COMPACT_REFERENCE,
  "current-review-26-825-files":
    process.env.CODEX_UI_KIT_CURRENT_REVIEW_26_825_WORKSPACE_WIDE_REFERENCE,
  "current-review-26-825-files-compact":
    process.env.CODEX_UI_KIT_CURRENT_REVIEW_26_825_WORKSPACE_COMPACT_REFERENCE,
};
const currentMcpSuccessReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_SUCCESS_REFERENCE;
const currentMcpSuccessReferenceSize = {
  height: 820,
  width: 1180,
};
const currentMcpRecoveryCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_RECOVERY_COMPACT_REFERENCE;
const currentMcpRecoveryCompactReferenceSize = {
  height: 680,
  width: 720,
};
const currentMcp26818SuccessReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_SUCCESS_26_818_REFERENCE;
const currentMcp26818SuccessReferenceSize = {
  height: 820,
  width: 1180,
};
const currentMcp26818RecoveryCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_818_COMPACT_REFERENCE;
const currentMcp26818RecoveryCompactReferenceSize = {
  height: 680,
  width: 720,
};
const currentMcp26818SourcesReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_SOURCES_26_818_REFERENCE;
const currentMcp26818SourcesReferenceSize = {
  height: 820,
  width: 1180,
};
const currentMcp26820SuccessReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_SUCCESS_26_820_REFERENCE;
const currentMcp26820FailureReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_FAILURE_26_820_REFERENCE;
const currentMcp26820RecoveryCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_820_COMPACT_REFERENCE;
const currentMcp26820SourcesReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_SOURCES_26_820_REFERENCE;
const currentMcp26825SuccessReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_SUCCESS_26_825_REFERENCE;
const currentMcp26825RecoveryReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_825_REFERENCE;
const currentMcp26825RecoveryCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_825_COMPACT_REFERENCE;
const currentMcp26825SourcesReference =
  process.env.CODEX_UI_KIT_CURRENT_MCP_SOURCES_26_825_REFERENCE;
const currentMcp26820WideReferenceSize = {
  height: 820,
  width: 1180,
};
const currentMcp26820CompactReferenceSize = {
  height: 680,
  width: 720,
};
const currentMcp26825WideReferenceSize = {
  height: 820,
  width: 1180,
};
const currentMcp26825CompactReferenceSize = {
  height: 680,
  width: 720,
};
const currentIntegrationRecoveryReference =
  process.env.CODEX_UI_KIT_CURRENT_INTEGRATION_RECOVERY_REFERENCE;
const currentIntegrationRecoveryReferenceSize = {
  height: 680,
  width: 720,
};
const currentBuildComposerQueuedReference =
  process.env.CODEX_UI_KIT_COMPOSER_QUEUED_REFERENCE;
const currentBuildComposerContinuedReference =
  process.env.CODEX_UI_KIT_COMPOSER_CONTINUED_REFERENCE;
const currentBuildComposerPausedReference =
  process.env.CODEX_UI_KIT_COMPOSER_PAUSED_REFERENCE;
const currentBuildComposerReferenceSize = {
  height: 320,
  width: 792,
};
const currentBuildComposerMultilineReference =
  process.env.CODEX_UI_KIT_COMPOSER_MULTILINE_REFERENCE;
const currentBuildComposerPermissionsReference =
  process.env.CODEX_UI_KIT_COMPOSER_PERMISSIONS_REFERENCE;
const currentBuildComposerResourcesReference =
  process.env.CODEX_UI_KIT_COMPOSER_RESOURCES_REFERENCE;
const currentBuildComposerGoalReference =
  process.env.CODEX_UI_KIT_COMPOSER_GOAL_REFERENCE;
const currentBuildComposerPlanReference =
  process.env.CODEX_UI_KIT_COMPOSER_PLAN_REFERENCE;
const currentComposer26820GoalReference =
  process.env.CODEX_UI_KIT_CURRENT_COMPOSER_26_820_GOAL_REFERENCE;
const currentComposer26820GoalCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_COMPOSER_26_820_GOAL_COMPACT_REFERENCE;
const currentComposer26820PlanReference =
  process.env.CODEX_UI_KIT_CURRENT_COMPOSER_26_820_PLAN_REFERENCE;
const currentComposer26820PlanCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_COMPOSER_26_820_PLAN_COMPACT_REFERENCE;
const currentBuildAttachmentReadyReference =
  process.env.CODEX_UI_KIT_ATTACHMENT_READY_REFERENCE;
const currentBuildAttachmentCompletedReference =
  process.env.CODEX_UI_KIT_ATTACHMENT_COMPLETED_REFERENCE;
const currentAttachmentPickerReference =
  process.env.CODEX_UI_KIT_CURRENT_ATTACHMENT_PICKER_REFERENCE;
const currentAttachmentPreviewReference =
  process.env.CODEX_UI_KIT_CURRENT_ATTACHMENT_PREVIEW_REFERENCE;
const currentBuildAttachmentReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildComposerMenuReferenceSize = {
  height: 820,
  width: 906,
};
const currentBuildLongThreadReference =
  process.env.CODEX_UI_KIT_LONG_THREAD_REFERENCE;
const currentBuildLongThreadReferenceSize = {
  height: 820,
  width: 906,
};
const current26820LongThreadWideReference =
  process.env.CODEX_UI_KIT_CURRENT_26_820_LONG_THREAD_WIDE_REFERENCE;
const current26820LongThreadCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_26_820_LONG_THREAD_COMPACT_REFERENCE;
const currentBuildApprovalPendingReference =
  process.env.CODEX_UI_KIT_APPROVAL_PENDING_REFERENCE;
const currentBuildApprovalDeniedReference =
  process.env.CODEX_UI_KIT_APPROVAL_DENIED_REFERENCE;
const currentBuildApprovalAllowOnceCompletedReference =
  process.env.CODEX_UI_KIT_APPROVAL_ALLOW_ONCE_COMPLETED_REFERENCE;
const currentBuildApprovalSimilarMenuReference =
  process.env.CODEX_UI_KIT_APPROVAL_SIMILAR_MENU_REFERENCE;
const currentBuildApprovalSimilarCompletedReference =
  process.env.CODEX_UI_KIT_APPROVAL_SIMILAR_COMPLETED_REFERENCE;
const currentBuildApprovalReferenceSize = {
  height: 820,
  width: 906,
};
const currentApprovalPendingRegionReference =
  process.env.CODEX_UI_KIT_CURRENT_APPROVAL_PENDING_REGION_REFERENCE;
const currentApprovalOptionsRegionReference =
  process.env.CODEX_UI_KIT_CURRENT_APPROVAL_OPTIONS_REGION_REFERENCE;
const currentApprovalDeniedComposerRegionReference =
  process.env.CODEX_UI_KIT_CURRENT_APPROVAL_DENIED_COMPOSER_REGION_REFERENCE;
const currentApproval26820PendingWideReference =
  process.env.CODEX_UI_KIT_CURRENT_APPROVAL_26_820_PENDING_WIDE_REFERENCE;
const currentApproval26820PendingCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_APPROVAL_26_820_PENDING_COMPACT_REFERENCE;
const currentApproval26820OptionsCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_APPROVAL_26_820_OPTIONS_COMPACT_REFERENCE;
const currentApprovalPendingRegionReferenceSize = {
  height: 162,
  width: 736,
};
const currentApprovalOptionsRegionReferenceSize = {
  height: 68,
  width: 194,
};
const currentApprovalDeniedComposerRegionReferenceSize = {
  height: 98,
  width: 736,
};
const currentBuildCommandOutputReference =
  process.env.CODEX_UI_KIT_COMMAND_OUTPUT_REFERENCE;
const currentBuildCommandOutputReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildCommandFailureReference =
  process.env.CODEX_UI_KIT_COMMAND_FAILURE_REFERENCE;
const currentBuildCommandFailureReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildCommandInterruptionReference =
  process.env.CODEX_UI_KIT_COMMAND_INTERRUPTION_REFERENCE;
const currentBuildCommandInterruptionReferenceSize = {
  height: 820,
  width: 1180,
};
const currentCommandFailureReference =
  process.env.CODEX_UI_KIT_CURRENT_COMMAND_FAILURE_26_818_REFERENCE;
const currentCommandInterruptionReference =
  process.env.CODEX_UI_KIT_CURRENT_COMMAND_INTERRUPTION_26_818_REFERENCE;
const currentCommandLifecycleReferenceSize = {
  height: 820,
  width: 1180,
};
const currentCommand26820SuccessReference =
  process.env.CODEX_UI_KIT_CURRENT_COMMAND_SUCCESS_26_820_REFERENCE;
const currentCommand26820FailureReference =
  process.env.CODEX_UI_KIT_CURRENT_COMMAND_FAILURE_26_820_REFERENCE;
const currentCommand26820InterruptionStoppedReference =
  process.env.CODEX_UI_KIT_CURRENT_COMMAND_INTERRUPTION_STOPPED_26_820_REFERENCE;
const currentCommand26820InterruptionCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_COMMAND_INTERRUPTION_RECOVERY_26_820_COMPACT_REFERENCE;
const currentCommand26820WideReferenceSize = {
  height: 820,
  width: 1180,
};
const currentCommand26820CompactReferenceSize = {
  height: 680,
  width: 720,
};
const currentThinking26825Reference =
  process.env.CODEX_UI_KIT_CURRENT_THINKING_26_825_REFERENCE;
const currentThinking26825ReferenceSize = {
  height: 820,
  width: 1180,
};
const currentPlan26825Reference =
  process.env.CODEX_UI_KIT_CURRENT_PLAN_26_825_REFERENCE;
const currentSearch26825Reference =
  process.env.CODEX_UI_KIT_CURRENT_SEARCH_26_825_REFERENCE;
const currentBrowser26825Reference =
  process.env.CODEX_UI_KIT_CURRENT_BROWSER_26_825_REFERENCE;
const currentPlan26825ReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildContextCompactionReference =
  process.env.CODEX_UI_KIT_CONTEXT_COMPACTION_REFERENCE;
const currentBuildContextCompactionReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildContextSummaryReference =
  process.env.CODEX_UI_KIT_CONTEXT_SUMMARY_REFERENCE;
const currentBuildContextSummaryReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildSubagentSummaryReference =
  process.env.CODEX_UI_KIT_SUBAGENT_SUMMARY_REFERENCE;
const currentBuildSubagentPanelReference =
  process.env.CODEX_UI_KIT_SUBAGENT_PANEL_REFERENCE;
const currentBuildSubagentTranscriptReference =
  process.env.CODEX_UI_KIT_SUBAGENT_TRANSCRIPT_REFERENCE;
const currentBuildSubagentConcurrentSummaryReference =
  process.env.CODEX_UI_KIT_SUBAGENT_CONCURRENT_SUMMARY_REFERENCE;
const currentBuildSubagentConcurrentMixedReference =
  process.env.CODEX_UI_KIT_SUBAGENT_CONCURRENT_MIXED_REFERENCE;
const currentBuildSubagentConcurrentCompletedReference =
  process.env.CODEX_UI_KIT_SUBAGENT_CONCURRENT_COMPLETED_REFERENCE;
const currentBuildSubagentConcurrentTranscriptReference =
  process.env.CODEX_UI_KIT_SUBAGENT_CONCURRENT_TRANSCRIPT_REFERENCE;
const currentBuildSubagentNestedRunningReference =
  process.env.CODEX_UI_KIT_SUBAGENT_NESTED_RUNNING_REFERENCE;
const currentBuildSubagentNestedMixedReference =
  process.env.CODEX_UI_KIT_SUBAGENT_NESTED_MIXED_REFERENCE;
const currentBuildSubagentNestedCompletedReference =
  process.env.CODEX_UI_KIT_SUBAGENT_NESTED_COMPLETED_REFERENCE;
const currentBuildSubagentNestedTranscriptReference =
  process.env.CODEX_UI_KIT_SUBAGENT_NESTED_TRANSCRIPT_REFERENCE;
const currentBuildWorkspaceReference =
  process.env.CODEX_UI_KIT_WORKSPACE_REFERENCE;
const currentDarkShellReference =
  process.env.CODEX_UI_KIT_CURRENT_DARK_SHELL_REFERENCE;
const currentLightShellReference =
  process.env.CODEX_UI_KIT_CURRENT_LIGHT_SHELL_REFERENCE;
const currentDarkShellCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_DARK_SHELL_COMPACT_REFERENCE;
const currentLightShellCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_LIGHT_SHELL_COMPACT_REFERENCE;
const currentProjectsIndexReference =
  process.env.CODEX_UI_KIT_CURRENT_PROJECTS_INDEX_REFERENCE;
const currentProjectsIndexReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildAppServerCrashReference =
  process.env.CODEX_UI_KIT_APP_SERVER_CRASH_REFERENCE;
const currentBuildAppServerCrashReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildWorkspaceReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildComposerIconReferenceBounds = [
  { height: 16, left: 387, name: "composer-project", top: 679, width: 16 },
  {
    height: 16,
    left: 505,
    name: "workspace-run-location-local",
    top: 679,
    width: 16,
  },
  { height: 16, left: 581, name: "composer-branch", top: 679, width: 16 },
  { height: 16, left: 373, name: "composer-add-files", top: 774, width: 16 },
  { height: 16, left: 407, name: "composer-permission", top: 774, width: 16 },
  {
    height: 14,
    left: 998,
    name: "composer-model-chevron",
    top: 775,
    width: 14,
  },
  { height: 16, left: 1029, name: "composer-dictate", top: 774, width: 16 },
  { height: 16, left: 1065, name: "composer-voice", top: 774, width: 16 },
];
const currentBuildWorkspaceProjectReference =
  process.env.CODEX_UI_KIT_WORKSPACE_PROJECT_REFERENCE;
const currentBuildWorkspaceProjectCompactReference =
  process.env.CODEX_UI_KIT_WORKSPACE_PROJECT_COMPACT_REFERENCE;
const currentBuildWorkspaceProjectReferenceSize = {
  height: 209,
  width: 252,
};
const currentBuildWorkspaceEnvironmentReference =
  process.env.CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_REFERENCE;
const currentBuildWorkspaceEnvironmentPickerReference =
  process.env.CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_PICKER_REFERENCE;
const currentBuildWorkspaceEnvironmentSettingsReference =
  process.env.CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_SETTINGS_REFERENCE;
const currentBuildWorkspaceNewWorktreeReference =
  process.env.CODEX_UI_KIT_WORKSPACE_NEW_WORKTREE_REFERENCE;
const currentBuildWorkspaceNoProjectReference =
  process.env.CODEX_UI_KIT_WORKSPACE_NO_PROJECT_REFERENCE;
const currentBuildWorkspaceCompactReference =
  process.env.CODEX_UI_KIT_WORKSPACE_COMPACT_REFERENCE;
const currentBuildWorkspaceWorktreeReference =
  process.env.CODEX_UI_KIT_WORKSPACE_WORKTREE_REFERENCE;
const currentBuildWorkspaceBranchCreateReference =
  process.env.CODEX_UI_KIT_WORKSPACE_BRANCH_CREATE_REFERENCE;
const currentBuildGitSettingsReference =
  process.env.CODEX_UI_KIT_GIT_SETTINGS_REFERENCE;
const currentBuildGitSettingsCompactReference =
  process.env.CODEX_UI_KIT_GIT_SETTINGS_COMPACT_REFERENCE;
const currentBuildAppearanceSettingsReference =
  process.env.CODEX_UI_KIT_APPEARANCE_SETTINGS_REFERENCE;
const currentBuildAppearanceSettingsCompactReference =
  process.env.CODEX_UI_KIT_APPEARANCE_SETTINGS_COMPACT_REFERENCE;
const currentBuildAppearanceSettingsPreferencesReference =
  process.env.CODEX_UI_KIT_APPEARANCE_SETTINGS_PREFERENCES_REFERENCE;
const currentBuildGeneralSettingsReference =
  process.env.CODEX_UI_KIT_GENERAL_SETTINGS_REFERENCE;
const currentBuildGeneralSettingsCompactReference =
  process.env.CODEX_UI_KIT_GENERAL_SETTINGS_COMPACT_REFERENCE;
const currentBuildGeneralSettingsHotkeyReference =
  process.env.CODEX_UI_KIT_GENERAL_SETTINGS_HOTKEY_REFERENCE;
const currentBuildGeneralSettingsBottomReference =
  process.env.CODEX_UI_KIT_GENERAL_SETTINGS_BOTTOM_REFERENCE;
const currentBuildPersonalizationSettingsReference =
  process.env.CODEX_UI_KIT_CURRENT_PERSONALIZATION_26_825_REFERENCE;
const currentBuildPersonalizationSettingsMenuReference =
  process.env.CODEX_UI_KIT_CURRENT_PERSONALIZATION_26_825_MENU_REFERENCE;
const currentBuildPersonalizationSettingsCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_PERSONALIZATION_26_825_COMPACT_REFERENCE;
const currentBuildKeyboardSettingsReference =
  process.env.CODEX_UI_KIT_CURRENT_KEYBOARD_26_825_REFERENCE;
const currentBuildKeyboardSettingsSearchReference =
  process.env.CODEX_UI_KIT_CURRENT_KEYBOARD_26_825_SEARCH_REFERENCE;
const currentBuildKeyboardSettingsCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_KEYBOARD_26_825_COMPACT_REFERENCE;
const currentBuildVoiceSettingsReference =
  process.env.CODEX_UI_KIT_CURRENT_VOICE_26_825_REFERENCE;
const currentBuildVoiceSettingsMicrophoneReference =
  process.env.CODEX_UI_KIT_CURRENT_VOICE_26_825_MICROPHONE_REFERENCE;
const currentBuildVoiceSettingsPickerReference =
  process.env.CODEX_UI_KIT_CURRENT_VOICE_26_825_PICKER_REFERENCE;
const currentBuildVoiceSettingsCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_VOICE_26_825_COMPACT_REFERENCE;
const currentBuildUsageSettingsReference =
  process.env.CODEX_UI_KIT_CURRENT_USAGE_26_825_REFERENCE;
const currentBuildUsageSettingsBottomReference =
  process.env.CODEX_UI_KIT_CURRENT_USAGE_26_825_BOTTOM_REFERENCE;
const currentBuildUsageSettingsCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_USAGE_26_825_COMPACT_REFERENCE;
const currentBuildUsageSettingsCompactBottomReference =
  process.env.CODEX_UI_KIT_CURRENT_USAGE_26_825_COMPACT_BOTTOM_REFERENCE;
const currentBuildPlanSettingsPersonalReference =
  process.env.CODEX_UI_KIT_CURRENT_PLAN_SETTINGS_26_825_PERSONAL_REFERENCE;
const currentBuildPlanSettingsBusinessReference =
  process.env.CODEX_UI_KIT_CURRENT_PLAN_SETTINGS_26_825_BUSINESS_REFERENCE;
const currentBuildPlanSettingsCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_PLAN_SETTINGS_26_825_COMPACT_REFERENCE;
const currentBuildWorktreeSettingsReference =
  process.env.CODEX_UI_KIT_CURRENT_26_825_WORKTREE_SETTINGS_REFERENCE;
const currentBuildHooksSettingsReference =
  process.env.CODEX_UI_KIT_HOOKS_SETTINGS_REFERENCE;
const currentBuildHooksSettingsCompactReference =
  process.env.CODEX_UI_KIT_HOOKS_SETTINGS_COMPACT_REFERENCE;
const currentBuildWorkspaceDirectoryMissingReference =
  process.env.CODEX_UI_KIT_WORKSPACE_DIRECTORY_MISSING_REFERENCE;
const currentBuildWorkspaceDirectoryMissingReferenceSize = {
  height: 1326,
  width: 2560,
};
const currentBuildSidebarReference =
  process.env.CODEX_UI_KIT_SIDEBAR_REFERENCE;
const currentBuildSidebarRecentsReference =
  process.env.CODEX_UI_KIT_SIDEBAR_RECENTS_REFERENCE;
const currentBuildSidebarProjectCollapsedReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_COLLAPSED_REFERENCE;
const currentBuildSidebarProjectMenuReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_MENU_REFERENCE;
const currentBuildSidebarProjectSubmenuReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_SUBMENU_REFERENCE;
const currentBuildSidebarHelpMenuReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_HELP_MENU_REFERENCE;
const currentBuildSidebarAccountMenuReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_REFERENCE;
const currentBuildSidebarAccountMenuLightReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_LIGHT_REFERENCE;
const currentBuildSidebarAccountMenuCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_COMPACT_REFERENCE;
const currentBuildSidebarAccountMenuLightCompactReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_LIGHT_COMPACT_REFERENCE;
const currentBuildSidebarFooterControlsReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_FOOTER_CONTROLS_REFERENCE;
const currentBuildSidebarCompactPinnedReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_COMPACT_PINNED_REFERENCE;
const currentBuildSidebarActiveStatusReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_ACTIVE_STATUS_REFERENCE;
const currentBuildSidebarWaitingStatusReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_WAITING_STATUS_REFERENCE;
const currentBuildSidebarUnreadStatusReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_UNREAD_STATUS_REFERENCE;
const currentBuildSidebarTaskActionsReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_TASK_ACTIONS_REFERENCE;
const currentSidebar26825ActiveStatusReference =
  process.env.CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_ACTIVE_STATUS_REFERENCE;
const currentSidebar26825UnreadStatusReference =
  process.env.CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_UNREAD_STATUS_REFERENCE;
const currentSidebar26825TaskActionsReference =
  process.env.CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_TASK_ACTIONS_REFERENCE;
const currentSidebar26825WorktreeActiveReference =
  process.env.CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_WORKTREE_ACTIVE_REFERENCE;
const currentSidebar26825WorktreeFailedReference =
  process.env.CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_WORKTREE_FAILED_REFERENCE;
const currentSidebar26825WorktreeRecoveredReference =
  process.env.CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_WORKTREE_RECOVERED_REFERENCE;
const currentWorktreeSetupFailureReference =
  process.env.CODEX_UI_KIT_CURRENT_26_825_WORKTREE_SETUP_FAILURE_REFERENCE;
const currentBuildSidebarRecentsActionsReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_RECENTS_ACTIONS_REFERENCE;
const currentBuildSidebarWorktreeLoadingReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_LOADING_REFERENCE;
const currentBuildSidebarWorktreeErrorReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_ERROR_REFERENCE;
const currentBuildSidebarWorktreeRestoredReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_RESTORED_REFERENCE;
const currentBuildSidebarEmptyCollectionReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_EMPTY_COLLECTION_REFERENCE;
const currentBuildSidebarShowMoreReference =
  process.env.CODEX_UI_KIT_CURRENT_SIDEBAR_SHOW_MORE_REFERENCE;
const currentBuildWindowChromeReference =
  process.env.CODEX_UI_KIT_WINDOW_CHROME_REFERENCE;
const defaultLifecycleMainPixelRatio = 0.0025;
const defaultLifecycleSidebarPixelRatio = 0.05;
const internalSidebarWidth = 274;
const currentBuildSidebarReferenceSize = {
  height: 820,
  width: 1180,
};
const currentBuildWindowChromeReferenceSize = {
  height: 46,
  width: 120,
};
await mkdir(baselineDirectory, { recursive: true });
await mkdir(artifactDirectory, { recursive: true });

function cropPng(source, left, top, width, height) {
  const crop = new PNG({ height, width });
  PNG.bitblt(source, crop, left, top, width, height, 0, 0);
  return crop;
}

function clonePng(source) {
  return PNG.sync.read(PNG.sync.write(source));
}

function comparePng(reference, actual, threshold = 0.05) {
  const diff = new PNG({ height: actual.height, width: actual.width });
  const pixels = pixelmatch(
    reference.data,
    actual.data,
    diff.data,
    actual.width,
    actual.height,
    {
      includeAA: false,
      threshold,
    },
  );
  return {
    diff,
    pixels,
    ratio: pixels / (actual.width * actual.height),
  };
}

function flattenPng(image, background) {
  for (let index = 0; index < image.data.length; index += 4) {
    const alpha = image.data[index + 3] / 255;
    if (alpha >= 1) continue;
    image.data[index] = Math.round(
      image.data[index] * alpha + background.red * (1 - alpha),
    );
    image.data[index + 1] = Math.round(
      image.data[index + 1] * alpha +
        background.green * (1 - alpha),
    );
    image.data[index + 2] = Math.round(
      image.data[index + 2] * alpha + background.blue * (1 - alpha),
    );
    image.data[index + 3] = 255;
  }
  return image;
}

function maskPng(image, masks) {
  for (const { height, left, top, width } of masks) {
    for (let y = top; y < top + height; y += 1) {
      for (let x = left; x < left + width; x += 1) {
        const index = (y * image.width + x) * 4;
        image.data[index] = 0;
        image.data[index + 1] = 0;
        image.data[index + 2] = 0;
        image.data[index + 3] = 0;
      }
    }
  }
  return image;
}

function foregroundMaskPng(image, threshold = 18) {
  const masked = clonePng(image);
  const background = {
    blue: image.data[2],
    green: image.data[1],
    red: image.data[0],
  };
  for (let index = 0; index < masked.data.length; index += 4) {
    const distance = Math.max(
      Math.abs(masked.data[index] - background.red),
      Math.abs(masked.data[index + 1] - background.green),
      Math.abs(masked.data[index + 2] - background.blue),
    );
    const value = distance > threshold ? 255 : 0;
    masked.data[index] = value;
    masked.data[index + 1] = value;
    masked.data[index + 2] = value;
    masked.data[index + 3] = 255;
  }
  return masked;
}

function environmentRatio(name, fallback) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be a ratio between 0 and 1.`);
  }
  return value;
}

async function compareCurrentBuildOverlay({
  actual,
  actualBounds,
  defaultMaximumRatio,
  expectedActualPosition,
  masks,
  maximumRatioName,
  referenceCrop,
  referencePath,
  referenceSize = currentBuildWorkspaceReferenceSize,
  sceneId,
}) {
  const referenceFull = flattenPng(
    PNG.sync.read(await readFile(referencePath)),
    { blue: 24, green: 24, red: 24 },
  );
  if (
    referenceFull.width !== referenceSize.width ||
    referenceFull.height !== referenceSize.height
  ) {
    throw new Error(
      `${sceneId}: current-build overlay reference must be exactly ${referenceSize.width}x${referenceSize.height}, received ${referenceFull.width}x${referenceFull.height}.`,
    );
  }
  if (
    !actualBounds ||
    actualBounds.width !== referenceCrop.width ||
    actualBounds.height !== referenceCrop.height
  ) {
    throw new Error(
      `${sceneId}: current-build overlay bounds do not match ${referenceCrop.width}x${referenceCrop.height}: ${JSON.stringify(actualBounds)}.`,
    );
  }
  if (
    expectedActualPosition &&
    (actualBounds.left !== expectedActualPosition.left ||
      actualBounds.top !== expectedActualPosition.top)
  ) {
    throw new Error(
      `${sceneId}: current-build overlay position does not match ${JSON.stringify(expectedActualPosition)}: ${JSON.stringify(actualBounds)}.`,
    );
  }
  const reference = cropPng(
    referenceFull,
    referenceCrop.left,
    referenceCrop.top,
    referenceCrop.width,
    referenceCrop.height,
  );
  const overlayActual = cropPng(
    actual,
    actualBounds.left,
    actualBounds.top,
    actualBounds.width,
    actualBounds.height,
  );
  const comparison = comparePng(
    maskPng(reference, masks),
    maskPng(overlayActual, masks),
  );
  const maximumRatio = environmentRatio(
    maximumRatioName,
    defaultMaximumRatio,
  );
  await writeFile(
    join(artifactDirectory, `${sceneId}.current-build.png`),
    PNG.sync.write(overlayActual),
  );
  const diffPath = join(
    artifactDirectory,
    `${sceneId}.current-build.diff.png`,
  );
  if (comparison.pixels > 0) {
    await writeFile(
      diffPath,
      PNG.sync.write(comparison.diff),
    );
  } else {
    await rm(diffPath, { force: true });
  }
  if (comparison.ratio > maximumRatio) {
    throw new Error(
      `${sceneId}: current-build overlay pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
    );
  }
  console.log(
    `${sceneId}: current-build overlay pixel ratio ${comparison.ratio}`,
  );
}

async function compareCurrentBasic26825({
  actual,
  referencePath,
  regions,
  sceneId,
}) {
  const reference = PNG.sync.read(await readFile(referencePath));
  if (
    reference.width !== actual.width ||
    reference.height !== actual.height
  ) {
    throw new Error(
      `${sceneId}: current 26.825 basic-thread reference must match the ${actual.width}x${actual.height} scene, received ${reference.width}x${reference.height}.`,
    );
  }
  const maximumRatios = {
    composer: environmentRatio(
      "CODEX_UI_KIT_CURRENT_BASIC_26_825_COMPOSER_MAX_DIFF_RATIO",
      0.01,
    ),
    header: environmentRatio(
      "CODEX_UI_KIT_CURRENT_BASIC_26_825_HEADER_MAX_DIFF_RATIO",
      0.07,
    ),
    thread: environmentRatio(
      "CODEX_UI_KIT_CURRENT_BASIC_26_825_THREAD_MAX_DIFF_RATIO",
      0.006,
    ),
  };
  for (const [name, region] of Object.entries(regions)) {
    const referenceRegion = cropPng(
      reference,
      region.left,
      region.top,
      region.width,
      region.height,
    );
    const actualRegion = cropPng(
      actual,
      region.left,
      region.top,
      region.width,
      region.height,
    );
    const comparison = comparePng(referenceRegion, actualRegion, 0.1);
    await writeFile(
      join(
        artifactDirectory,
        `${sceneId}.${name}.current-product.png`,
      ),
      PNG.sync.write(referenceRegion),
    );
    await writeFile(
      join(
        artifactDirectory,
        `${sceneId}.${name}.current-build.png`,
      ),
      PNG.sync.write(actualRegion),
    );
    const diffPath = join(
      artifactDirectory,
      `${sceneId}.${name}.current-build.diff.png`,
    );
    if (comparison.pixels > 0) {
      await writeFile(diffPath, PNG.sync.write(comparison.diff));
    } else {
      await rm(diffPath, { force: true });
    }
    if (comparison.ratio > maximumRatios[name]) {
      throw new Error(
        `${sceneId}: current 26.825 ${name} pixel ratio ${comparison.ratio} exceeds ${maximumRatios[name]}.`,
      );
    }
    console.log(
      `${sceneId}: current 26.825 ${name} pixel ratio ${comparison.ratio}`,
    );
  }
}

async function compareCurrentCommand26825({
  actual,
  referencePath,
  regions,
  sceneId,
}) {
  const reference = PNG.sync.read(await readFile(referencePath));
  if (
    reference.width !== actual.width ||
    reference.height !== actual.height
  ) {
    throw new Error(
      `${sceneId}: current 26.825 command reference must match the ${actual.width}x${actual.height} scene, received ${reference.width}x${reference.height}.`,
    );
  }
  const maximumRatios = {
    activity: environmentRatio(
      "CODEX_UI_KIT_CURRENT_COMMAND_26_825_ACTIVITY_MAX_DIFF_RATIO",
      0.023,
    ),
    composer: environmentRatio(
      "CODEX_UI_KIT_CURRENT_COMMAND_26_825_COMPOSER_MAX_DIFF_RATIO",
      0.012,
    ),
    header: environmentRatio(
      "CODEX_UI_KIT_CURRENT_COMMAND_26_825_HEADER_MAX_DIFF_RATIO",
      0.07,
    ),
  };
  for (const [name, region] of Object.entries(regions)) {
    const referenceRegion = cropPng(
      reference,
      region.left,
      region.top,
      region.width,
      region.height,
    );
    const actualRegion = cropPng(
      actual,
      region.left,
      region.top,
      region.width,
      region.height,
    );
    const comparison = comparePng(referenceRegion, actualRegion, 0.1);
    await writeFile(
      join(
        artifactDirectory,
        `${sceneId}.${name}.current-product.png`,
      ),
      PNG.sync.write(referenceRegion),
    );
    await writeFile(
      join(
        artifactDirectory,
        `${sceneId}.${name}.current-build.png`,
      ),
      PNG.sync.write(actualRegion),
    );
    const diffPath = join(
      artifactDirectory,
      `${sceneId}.${name}.current-build.diff.png`,
    );
    if (comparison.pixels > 0) {
      await writeFile(diffPath, PNG.sync.write(comparison.diff));
    } else {
      await rm(diffPath, { force: true });
    }
    if (comparison.ratio > maximumRatios[name]) {
      throw new Error(
        `${sceneId}: current 26.825 command ${name} pixel ratio ${comparison.ratio} exceeds ${maximumRatios[name]}.`,
      );
    }
    console.log(
      `${sceneId}: current 26.825 command ${name} pixel ratio ${comparison.ratio}`,
    );
  }
}

async function compareCurrentReview26825({
  actual,
  referencePath,
  regions,
  sceneId,
}) {
  const reference = PNG.sync.read(await readFile(referencePath));
  if (
    reference.width !== actual.width ||
    reference.height !== actual.height
  ) {
    throw new Error(
      `${sceneId}: current 26.825 Review reference must match the ${actual.width}x${actual.height} scene, received ${reference.width}x${reference.height}.`,
    );
  }
  const maximumRatios = {
    card: environmentRatio(
      "CODEX_UI_KIT_CURRENT_REVIEW_26_825_CARD_MAX_DIFF_RATIO",
      0.066,
    ),
    panel: environmentRatio(
      "CODEX_UI_KIT_CURRENT_REVIEW_26_825_PANEL_MAX_DIFF_RATIO",
      0.03,
    ),
  };
  for (const [name, region] of Object.entries(regions)) {
    const referenceRegion = cropPng(
      reference,
      region.left,
      region.top,
      region.width,
      region.height,
    );
    const actualRegion = cropPng(
      actual,
      region.left,
      region.top,
      region.width,
      region.height,
    );
    const comparison = comparePng(referenceRegion, actualRegion, 0.1);
    await writeFile(
      join(artifactDirectory, `${sceneId}.${name}.current-product.png`),
      PNG.sync.write(referenceRegion),
    );
    await writeFile(
      join(artifactDirectory, `${sceneId}.${name}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    const diffPath = join(
      artifactDirectory,
      `${sceneId}.${name}.current-build.diff.png`,
    );
    if (comparison.pixels > 0) {
      await writeFile(diffPath, PNG.sync.write(comparison.diff));
    } else {
      await rm(diffPath, { force: true });
    }
    if (comparison.ratio > maximumRatios[name]) {
      throw new Error(
        `${sceneId}: current 26.825 Review ${name} pixel ratio ${comparison.ratio} exceeds ${maximumRatios[name]}.`,
      );
    }
    console.log(
      `${sceneId}: current 26.825 Review ${name} pixel ratio ${comparison.ratio}`,
    );
  }
}

async function compareCurrentBuildSidebarStatus({
  actual,
  actualBounds,
  defaultMaximumRatio,
  maximumRatioName,
  ownedWidth = 28,
  referencePath,
  sceneId,
  status,
}) {
  const reference = flattenPng(
    PNG.sync.read(await readFile(referencePath)),
    { blue: 24, green: 24, red: 24 },
  );
  if (
    (reference.width !== 259 &&
      reference.width !== 306 &&
      reference.width !== ownedWidth) ||
    reference.height !== 30
  ) {
    throw new Error(
      `${sceneId}: ${status} status reference must be exactly 259x30 or ${ownedWidth}x30, received ${reference.width}x${reference.height}.`,
    );
  }
  if (
    !actualBounds ||
    ![258, 306].includes(actualBounds.width) ||
    actualBounds.height !== 30
  ) {
    throw new Error(
      `${sceneId}: ${status} status row must be exactly 258x30 or 306x30: ${JSON.stringify(actualBounds)}.`,
    );
  }
  const actualRow = cropPng(
    actual,
    actualBounds.left,
    actualBounds.top,
    actualBounds.width,
    actualBounds.height,
  );
  const referenceRail =
    reference.width === ownedWidth
      ? reference
      : cropPng(
          reference,
          reference.width - ownedWidth,
          0,
          ownedWidth,
          30,
        );
  const actualRail = cropPng(
    actualRow,
    actualRow.width - ownedWidth,
    0,
    ownedWidth,
    30,
  );
  const comparison = comparePng(
    foregroundMaskPng(referenceRail),
    foregroundMaskPng(actualRail),
    0,
  );
  const maximumRatio = environmentRatio(
    maximumRatioName,
    defaultMaximumRatio,
  );
  await writeFile(
    join(artifactDirectory, `${sceneId}.${status}.current-build.png`),
    PNG.sync.write(actualRail),
  );
  if (comparison.pixels > 0) {
    await writeFile(
      join(
        artifactDirectory,
        `${sceneId}.${status}.current-build.diff.png`,
      ),
      PNG.sync.write(comparison.diff),
    );
  }
  if (comparison.ratio > maximumRatio) {
    throw new Error(
      `${sceneId}: ${status} status pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
    );
  }
  console.log(
    `${sceneId}: ${status} status pixel ratio ${comparison.ratio}`,
  );
}

async function compareCurrentBuildSidebarActions({
  actualPath,
  defaultMaximumRatio,
  foregroundOnly = false,
  maximumRatioName,
  ownedWidth = 72,
  referencePath,
  sceneId,
  variant,
}) {
  const reference = flattenPng(
    PNG.sync.read(await readFile(referencePath)),
    { blue: 24, green: 24, red: 24 },
  );
  const actual = flattenPng(PNG.sync.read(await readFile(actualPath)), {
    blue: 24,
    green: 24,
    red: 24,
  });
  if (
    reference.width !== ownedWidth ||
    reference.height !== 30 ||
    actual.width !== ownedWidth ||
    actual.height !== 30
  ) {
    throw new Error(
      `${sceneId}: ${variant} action crops must both be exactly ${ownedWidth}x30.`,
    );
  }
  const comparison = foregroundOnly
    ? comparePng(
        foregroundMaskPng(reference),
        foregroundMaskPng(actual),
        0,
      )
    : comparePng(reference, actual);
  const maximumRatio = environmentRatio(
    maximumRatioName,
    defaultMaximumRatio,
  );
  if (comparison.pixels > 0) {
    await writeFile(
      join(
        artifactDirectory,
        `${sceneId}.${variant}.current-build.diff.png`,
      ),
      PNG.sync.write(comparison.diff),
    );
  }
  if (comparison.ratio > maximumRatio) {
    throw new Error(
      `${sceneId}: ${variant} action pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
    );
  }
  console.log(
    `${sceneId}: ${variant} action pixel ratio ${comparison.ratio}`,
  );
}

async function compareCurrentBuildWorkspaceFrame({
  actual,
  defaultMaximumRatio,
  masks,
  maximumRatioName,
  referenceCrop,
  referencePath,
  sceneId,
}) {
  const referenceFull = flattenPng(
    PNG.sync.read(await readFile(referencePath)),
    { blue: 24, green: 24, red: 24 },
  );
  const reference = referenceCrop
    ? cropPng(
        referenceFull,
        referenceCrop.left,
        referenceCrop.top,
        referenceCrop.width,
        referenceCrop.height,
      )
    : referenceFull;
  if (
    reference.width !== actual.width ||
    reference.height !== actual.height
  ) {
    throw new Error(
      `${sceneId}: current-build workspace frame must match ${actual.width}x${actual.height}, received ${reference.width}x${reference.height}.`,
    );
  }
  const comparison = comparePng(
    maskPng(reference, masks),
    maskPng(actual, masks),
  );
  const maximumRatio = environmentRatio(
    maximumRatioName,
    defaultMaximumRatio,
  );
  await writeFile(
    join(artifactDirectory, `${sceneId}.current-build.png`),
    PNG.sync.write(actual),
  );
  if (comparison.pixels > 0) {
    await writeFile(
      join(artifactDirectory, `${sceneId}.current-build.diff.png`),
      PNG.sync.write(comparison.diff),
    );
  }
  if (comparison.ratio > maximumRatio) {
    throw new Error(
      `${sceneId}: current-build workspace frame pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
    );
  }
  console.log(
    `${sceneId}: current-build workspace frame pixel ratio ${comparison.ratio}`,
  );
}

const regionalFailures = [];

for (const scene of selectedScenes) {
  const { app, page } = await launchScene(scene);
  const actualPath = join(artifactDirectory, `${scene.id}.png`);
  const baselinePath = join(baselineDirectory, `${scene.id}.png`);
  const diffPath = join(artifactDirectory, `${scene.id}.diff.png`);
  let sidebarSelectedTop;
  let sidebarCollectionBounds;
  let sidebarShowMoreBounds;
  let sidebarStatusBounds;
  let sidebarTaskActionsActualPath;
  let sidebarRecentsActionsActualPath;
  let sidebarMenuBounds;
  let sidebarMenuItemBounds;
  let sidebarProjectSubmenuBounds;
  let sidebarProjectSubmenuItemBounds;
  let sidebarRecentsBounds;
  let workspaceCurrentIconBounds;
  let workspaceEnvironmentMenuBounds;
  let workspaceEnvironmentPickerBounds;
  let workspaceEnvironmentSettingsBounds;
  let workspaceProjectListboxBounds;
  let currentComposer26820ModeBounds;
  let workspaceWorktreeMenuBounds;
  let workspaceBranchCreateBounds;
  let currentApprovalBounds;
  let currentApprovalOptionsBounds;
  let currentApprovalComposerBounds;
  let currentApproval26820Bounds;
  let currentApproval26820OptionsBounds;
  let currentBasicThreadBounds;
  let currentCommandFailureBounds;
  let currentCommandInterruptionBounds;
  let currentThinking26825Bounds;
  let currentPlan26825Bounds;
  let currentSearchBrowser26825Bounds;
  let currentMarkdownStreamingBounds;

  try {
    if (scene.id === "workspace-ready") {
      workspaceCurrentIconBounds = await page.evaluate(() =>
        Array.from(
          document.querySelectorAll(
            ".demo-workspace-start [data-current-build-icon]",
          ),
          (icon) => {
            const value = icon.getBoundingClientRect();
            return {
              height: Math.round(value.height),
              left: Math.round(value.left),
              name: icon.getAttribute("data-current-build-icon"),
              top: Math.round(value.top),
              width: Math.round(value.width),
            };
          },
        ),
      );
    }
    if (scene.id === "current-sidebar") {
      sidebarSelectedTop = await page.evaluate(() => {
        const current = Array.from(
          document.querySelectorAll(
            ".codex-ui-app-sidebar__project-group > .codex-ui-app-sidebar__item-row > [aria-current=\"page\"]",
          ),
        );
        if (current.length !== 1) {
          throw new Error(
            `Expected one current sidebar page, received ${current.length}.`,
          );
        }
        return Math.round(current[0].getBoundingClientRect().top);
      });
    }
    if (scene.id === "current-sidebar-recents") {
      sidebarRecentsBounds = await page
        .locator(
          '.codex-ui-app-sidebar__section[data-kind="threads"]',
        )
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "current-sidebar-status-lifecycle") {
      sidebarStatusBounds = await page.evaluate(() =>
        Object.fromEntries(
          [
            ["active", "session-browser:0"],
            ["waiting", "desktop-cleanup:0"],
            ["error", "desktop-cleanup:1"],
            ["unread", "codex-ui-kit:0"],
            ["worktree-loading", "codex-ui-kit:1"],
            ["worktree-error", "design-assets:2"],
            ["worktree-restored", "protocol-client:0"],
          ].map(([status, fixture]) => {
            const item = document.querySelector(
              `[data-sidebar-status-fixture="${fixture}"]`,
            );
            const row = item?.closest(
              ".codex-ui-app-sidebar__item-row",
            );
            const value = row?.getBoundingClientRect();
            return [
              status,
              value
                ? {
                    height: Math.round(value.height),
                    left: Math.round(value.left),
                    top: Math.round(value.top),
                    width: Math.round(value.width),
                  }
                : null,
            ];
          }),
        ),
      );
    }
    if (scene.id.startsWith("current-sidebar-thread-lifecycle")) {
      sidebarStatusBounds = await page.evaluate(() =>
        Object.fromEntries(
          ["active", "unread"].map((fixture) => {
            const item = document.querySelector(
              `[data-sidebar-thread-lifecycle-fixture="${fixture}"]`,
            );
            const row = item?.closest(
              ".codex-ui-app-sidebar__item-row",
            );
            const value = row?.getBoundingClientRect();
            return [
              fixture,
              value
                ? {
                    height: Math.round(value.height),
                    left: Math.round(value.left),
                    top: Math.round(value.top),
                    width: Math.round(value.width),
                  }
                : null,
            ];
          }),
        ),
      );
    }
    if (scene.id.startsWith("current-sidebar-worktree-lifecycle")) {
      sidebarStatusBounds = await page.evaluate(() =>
        Object.fromEntries(
          ["active", "failed", "recovered", "restored"].map((fixture) => {
            const item = document.querySelector(
              `[data-sidebar-worktree-status-fixture="current-worktree-${fixture}"]`,
            );
            const row = item?.closest(
              ".codex-ui-app-sidebar__item-row",
            );
            const value = row?.getBoundingClientRect();
            return [
              fixture,
              value
                ? {
                    height: Math.round(value.height),
                    left: Math.round(value.left),
                    top: Math.round(value.top),
                    width: Math.round(value.width),
                  }
                : null,
            ];
          }),
        ),
      );
    }
    if (scene.id.startsWith("current-sidebar-collection-")) {
      sidebarCollectionBounds = await page
        .locator("[data-sidebar-collection-fixture]")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
      if (scene.id === "current-sidebar-collection-long-list") {
        sidebarShowMoreBounds = await page
          .locator(".codex-ui-app-sidebar__collection-toggle-item")
          .evaluate((element) => {
            const value = element.getBoundingClientRect();
            return {
              height: Math.round(value.height),
              left: Math.round(value.left),
              top: Math.round(value.top),
              width: Math.round(value.width),
            };
          });
      }
    }
    if (
      scene.id === "current-sidebar-project-menu" ||
      scene.id === "current-sidebar-project-section-submenu" ||
      scene.id === "current-sidebar-help-menu" ||
      scene.id.startsWith("current-sidebar-account-menu")
    ) {
      const menu =
        scene.id === "current-sidebar-project-section-submenu"
          ? page.getByRole("menu", { name: "session-browser project menu" })
          : page.locator('[role="menu"]');
      sidebarMenuBounds = await menu.evaluate((element) => {
        const value = element.getBoundingClientRect();
        return {
          height: Math.round(value.height),
          left: Math.round(value.left),
          top: Math.round(value.top),
          width: Math.round(value.width),
        };
      });
      sidebarMenuItemBounds = await menu
        .locator('[role="menuitem"]')
        .evaluateAll((elements) => {
          const menuBounds = elements[0]
            ?.closest('[role="menu"]')
            ?.getBoundingClientRect();
          if (!menuBounds) return [];
          return elements.map((element) => {
            const value = element.getBoundingClientRect();
            return {
              height: Math.round(value.height),
              left: Math.round(value.left - menuBounds.left),
              top: Math.round(value.top - menuBounds.top),
              width: Math.round(value.width),
            };
          });
        });
      if (scene.id === "current-sidebar-project-section-submenu") {
        const submenu = page.getByRole("menu", { name: "Section submenu" });
        sidebarProjectSubmenuBounds = await submenu.evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
        sidebarProjectSubmenuItemBounds = await submenu
          .locator('[role="menuitem"]')
          .evaluateAll((elements) => {
            const menuBounds = elements[0]
              ?.closest('[role="menu"]')
              ?.getBoundingClientRect();
            if (!menuBounds) return [];
            return elements.map((element) => {
              const value = element.getBoundingClientRect();
              return {
                height: Math.round(value.height),
                left: Math.round(value.left - menuBounds.left),
                top: Math.round(value.top - menuBounds.top),
                width: Math.round(value.width),
              };
            });
          });
      } else {
        await page.evaluate(() => {
          const active = document.activeElement;
          if (active instanceof HTMLElement) active.blur();
        });
      }
    }
    if (scene.id === "current-sidebar-project-collapsed") {
      await page
        .locator(
          ".codex-ui-app-sidebar__project-group > .codex-ui-app-sidebar__item-row > button",
        )
        .first()
        .focus();
    }
    if (scene.id === "current-basic-thread") {
      currentBasicThreadBounds = await page
        .locator(".codex-ui-conversation-thread-shell__thread")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(window.innerHeight - value.top),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "current-command-failure-expanded") {
      currentCommandFailureBounds = {
        height: 253,
        left: 222,
        top: 273,
        width: 736,
      };
    }
    if (scene.id === "current-command-interruption-recovered") {
      currentCommandInterruptionBounds = {
        height: 211,
        left: 222,
        top: 451,
        width: 736,
      };
    }
    if (scene.id === "conversation-thinking-current-26-825") {
      currentThinking26825Bounds = await page
        .locator(".codex-ui-thread-thinking .codex-ui-loading-shimmer__highlight")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "conversation-plan-current-26-825-open") {
      currentPlan26825Bounds = await page.evaluate(() => {
        const rect = (element) => {
          const value = element?.getBoundingClientRect();
          return value
            ? {
                bottom: Math.round(value.bottom),
                height: Math.round(value.height),
                left: value.left,
                top: Math.round(value.top),
                width: value.width,
              }
            : null;
        };
        return {
          tooltip: rect(
            document.querySelector(
              ".codex-ui-composer-plan-progress__tooltip",
            ),
          ),
          trigger: rect(
            document.querySelector(
              ".codex-ui-composer-plan-progress__trigger",
            ),
          ),
        };
      });
    }
    if (
      scene.id === "conversation-search-current-26-825-open" ||
      scene.id === "conversation-browser-current-26-825-open"
    ) {
      currentSearchBrowser26825Bounds = await page.evaluate(() => {
        const rect = (element) => {
          const value = element?.getBoundingClientRect();
          return value
            ? {
                height: Math.round(value.height),
                left: Math.round(value.left),
                top: Math.round(value.top),
                width: Math.round(value.width),
              }
            : null;
        };
        return {
          activity: rect(
            document.querySelector(
              ".demo-current-search-26-825-timeline .codex-ui-search-activity, .demo-current-browser-26-825-timeline .codex-ui-browser-activity",
            ),
          ),
          browser: rect(
            document.querySelector(
              ".codex-ui-app-shell__side-panel",
            ),
          ),
        };
      });
    }
    if (scene.id === "multi-file-review") {
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
    }
    if (
      scene.id === "workspace-project-menu" ||
      scene.id === "workspace-project-menu-compact"
    ) {
      workspaceProjectListboxBounds = await page
        .locator(
          ".demo-workspace-project-dialog .codex-ui-conversation-project-options",
        )
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.ceil(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (
      scene.id === "composer-goal" ||
      scene.id === "composer-goal-compact" ||
      scene.id === "composer-plan" ||
      scene.id === "composer-plan-compact"
    ) {
      currentComposer26820ModeBounds = await page
        .locator(".codex-ui-composer")
        .evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return {
            height: Math.round(rect.height),
            left: Math.round(rect.left),
            top: Math.round(rect.top),
            width: Math.round(rect.width),
          };
        });
    }
    if (scene.id === "workspace-environment-menu") {
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
      workspaceEnvironmentMenuBounds = await page
        .locator(".demo-workspace-environment-menu[role=\"menu\"]")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "workspace-environment-picker") {
      workspaceEnvironmentPickerBounds = await page
        .locator(
          ".demo-workspace-worktree-environment-menu[role=\"menu\"]",
        )
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "workspace-environments-unavailable") {
      workspaceEnvironmentSettingsBounds = await page
        .locator(".codex-ui-environment-settings-page")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "workspace-worktree-menu") {
      workspaceWorktreeMenuBounds = await page
        .locator(".demo-workspace-worktree-menu[role=\"menu\"]")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "workspace-branch-create") {
      workspaceBranchCreateBounds = await page
        .locator(".codex-ui-branch-creation-dialog [role=\"dialog\"]")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
      await page.evaluate(() => {
        const active = document.activeElement;
        if (active instanceof HTMLElement) active.blur();
      });
    }
    if (
      scene.id === "markdown-complete" ||
      scene.scenario === "markdown-streaming-large" ||
      scene.scenario === "markdown-table-actions"
    ) {
      await page.addStyleTag({
        content: `
          .codex-ui-conversation-thread-shell__viewport,
          .codex-ui-markdown__table-scroll,
          .codex-ui-markdown-table-preview__surface {
            scrollbar-width: none;
          }

          .codex-ui-conversation-thread-shell__viewport::-webkit-scrollbar,
          .codex-ui-markdown__table-scroll::-webkit-scrollbar,
          .codex-ui-markdown-table-preview__surface::-webkit-scrollbar {
            display: none;
          }
        `,
      });
    }
    if (scene.markdownTableState) {
      const tableContainer = page.locator(
        '[data-item-id="assistant-markdown-table-actions"] [data-markdown-table]',
      );
      await tableContainer.scrollIntoViewIfNeeded();
      await tableContainer.hover();
      await page.waitForTimeout(150);
      if (scene.id === "markdown-table-actions-narrow") {
        const actions = tableContainer.locator(
          ".codex-ui-markdown__table-actions",
        );
        const actionBounds = await actions.boundingBox();
        const buttonBounds = await Promise.all(
          (await actions.locator("button").all()).map((button) =>
            button.boundingBox(),
          ),
        );
        if (
          !actionBounds ||
          actionBounds.left < 0 ||
          actionBounds.left + actionBounds.width > 720 ||
          buttonBounds.some(
            (bounds) =>
              !bounds || bounds.left < 0 || bounds.left + bounds.width > 720,
          )
        ) {
          throw new Error(
            `${scene.id}: narrow table actions are clipped: ${JSON.stringify({ actionBounds, buttonBounds })}`,
          );
        }
      }
      if (scene.markdownTableState === "preview") {
        await tableContainer
          .getByRole("button", { name: "Expand table" })
          .click();
        await page
          .getByRole("dialog", { name: "Table preview" })
          .waitFor({ state: "visible" });
      }
    }
    if (
      scene.id === "approval-current-options" ||
      scene.id === "approval-current-similar-menu" ||
      scene.id === "approval-current-session-menu" ||
      scene.id === "approval-current-26-820-file-options-compact"
    ) {
      await page
        .getByTestId("current-approval-request")
        .getByRole("button", { name: "Approval options" })
        .click();
      await page
        .locator(
          '.codex-ui-approval-request__options-menu [role="menuitem"]',
        )
        .filter({
          hasText:
            scene.id === "approval-current-session-menu"
              ? "Allow all edits"
              : scene.id === "approval-current-26-820-file-options-compact"
                ? "Allow this conversation"
              : "Allow similar commands",
        })
        .waitFor();
    }
    if (
      scene.id === "approval-current-pending" ||
      scene.id === "approval-current-options"
    ) {
      currentApprovalBounds = await page
        .locator(".codex-ui-approval-request")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "approval-current-options") {
      currentApprovalOptionsBounds = await page
        .locator(".codex-ui-approval-request__options-menu")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (
      scene.id === "approval-current-26-820-file-deny-pending" ||
      scene.id === "approval-current-26-820-file-deny-pending-compact"
    ) {
      currentApproval26820Bounds = await page
        .locator(".demo-current-26-820-file-approval")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "approval-current-26-820-file-options-compact") {
      currentApproval26820OptionsBounds = await page
        .locator(".codex-ui-approval-request__options-menu")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "approval-current-denied") {
      currentApprovalComposerBounds = await page
        .locator(".codex-ui-composer")
        .evaluate((element) => {
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        });
    }
    if (scene.id === "mcp-current-success") {
      await page
        .locator(
          '[data-item-id="mcp-current-fetch"] .codex-ui-activity__header',
        )
        .hover();
    }
    if (scene.id === "current-sidebar-thread-lifecycle-hover") {
      await page
        .locator('[data-sidebar-thread-lifecycle-fixture="active"]')
        .locator("..")
        .hover();
      await page.waitForTimeout(150);
    }
    if (scene.scenario === "markdown-streaming-large") {
      currentMarkdownStreamingBounds = await page.evaluate(() => {
        const root = document.querySelector(
          '[data-item-id="assistant-markdown-streaming-large"] .codex-ui-markdown',
        );
        const table = root?.querySelector("table");
        const section29 = Array.from(root?.querySelectorAll("h2") ?? []).find(
          (heading) => heading.textContent?.trim() === "Section 29",
        );
        const bounds = (element) => {
          if (!(element instanceof Element)) return null;
          const value = element.getBoundingClientRect();
          return {
            height: Math.round(value.height),
            left: Math.round(value.left),
            top: Math.round(value.top),
            width: Math.round(value.width),
          };
        };
        return {
          root: bounds(root),
          section29: bounds(section29),
          table: bounds(table),
        };
      });
    }
    await page.screenshot({
      animations: "disabled",
      path: actualPath,
      type: "png",
    });
    if (
      scene.id === "current-sidebar-status-lifecycle" &&
      currentBuildSidebarTaskActionsReference
    ) {
      const row = page
        .locator('[data-sidebar-status-fixture="session-browser:0"]')
        .locator("..");
      await row.hover();
      await page.waitForTimeout(150);
      const bounds = await row.boundingBox();
      if (!bounds || bounds.height !== 30 || bounds.width !== 258) {
        throw new Error(
          `${scene.id}: task action row must be exactly 258x30.`,
        );
      }
      sidebarTaskActionsActualPath = join(
        artifactDirectory,
        `${scene.id}.task-actions.current-build.png`,
      );
      await page.screenshot({
        animations: "disabled",
        clip: {
          height: 30,
          width: 72,
          x: bounds.x + bounds.width - 72,
          y: bounds.y,
        },
        path: sidebarTaskActionsActualPath,
        type: "png",
      });
    }
    if (
      scene.id === "current-sidebar-thread-lifecycle" &&
      currentSidebar26825TaskActionsReference
    ) {
      const row = page
        .locator('[data-sidebar-thread-lifecycle-fixture="active"]')
        .locator("..");
      await row.hover();
      await page.waitForTimeout(150);
      const bounds = await row.boundingBox();
      if (
        !bounds ||
        bounds.height !== 30 ||
        Math.abs(bounds.width - 305.875) > 0.1
      ) {
        throw new Error(
          `${scene.id}: current task action row must be exactly 305.875x30.`,
        );
      }
      sidebarTaskActionsActualPath = join(
        artifactDirectory,
        `${scene.id}.task-actions.current-build.png`,
      );
      await page.screenshot({
        animations: "disabled",
        clip: {
          height: 30,
          width: 56,
          x: bounds.x + bounds.width - 56,
          y: bounds.y,
        },
        path: sidebarTaskActionsActualPath,
        type: "png",
      });
    }
    if (
      scene.id === "current-sidebar-recents" &&
      currentBuildSidebarRecentsActionsReference
    ) {
      const row = page
        .locator(
          '.codex-ui-app-sidebar__section[data-kind="threads"] .codex-ui-app-sidebar__item-row',
        )
        .first();
      await row.hover();
      await page.waitForTimeout(150);
      const bounds = await row.boundingBox();
      if (!bounds || bounds.height !== 30 || bounds.width !== 258) {
        throw new Error(
          `${scene.id}: Recents action row must be exactly 258x30.`,
        );
      }
      sidebarRecentsActionsActualPath = join(
        artifactDirectory,
        `${scene.id}.recents-actions.current-build.png`,
      );
      await page.screenshot({
        animations: "disabled",
        clip: {
          height: 30,
          width: 72,
          x: bounds.x + bounds.width - 72,
          y: bounds.y,
        },
        path: sidebarRecentsActionsActualPath,
        type: "png",
      });
    }
  } finally {
    await app.close();
  }

  if (update || !existsSync(baselinePath)) {
    if (!update) {
      throw new Error(
        `Missing ${baselinePath}. Run pnpm visual:update after reviewing the artifact.`,
      );
    }
    await writeFile(baselinePath, await readFile(actualPath));
    continue;
  }

  const baseline = PNG.sync.read(await readFile(baselinePath));
  const actual = PNG.sync.read(await readFile(actualPath));
  if (baseline.width !== actual.width || baseline.height !== actual.height) {
    throw new Error(
      `${scene.id}: image dimensions changed from ${baseline.width}x${baseline.height} to ${actual.width}x${actual.height}.`,
    );
  }

  const currentMarkdownStreamingReference = {
    "markdown-stream-fence": currentMarkdownStreamFenceReference,
    "markdown-stream-table": currentMarkdownStreamTableReference,
    "markdown-stream-large": currentMarkdownStreamLongReference,
    "markdown-stream-complete": currentMarkdownStreamCompleteReference,
  }[scene.id];
  if (currentMarkdownStreamingReference) {
    const reference = PNG.sync.read(
      await readFile(currentMarkdownStreamingReference),
    );
    if (
      reference.width !== 1180 ||
      reference.height !== 820 ||
      actual.width !== 1180 ||
      actual.height !== 820 ||
      !currentMarkdownStreamingBounds
    ) {
      throw new Error(
        `${scene.id}: current rich Markdown comparison requires exact 1180x820 frames and measured response bounds.`,
      );
    }
    const regions = {
      "markdown-stream-fence": {
        actual: currentMarkdownStreamingBounds.root,
        reference: { height: 187, left: 383, top: 595, width: 736 },
      },
      "markdown-stream-table": {
        actual: currentMarkdownStreamingBounds.table,
        reference: { height: 123, left: 383, top: 470, width: 736 },
      },
      "markdown-stream-large": {
        actual: currentMarkdownStreamingBounds.root
          ? { ...currentMarkdownStreamingBounds.root, height: 480 }
          : null,
        reference: { height: 480, left: 383, top: 222, width: 736 },
      },
      "markdown-stream-complete": {
        actual: currentMarkdownStreamingBounds.section29
          ? { ...currentMarkdownStreamingBounds.section29, height: 620 }
          : null,
        reference: { height: 620, left: 383, top: 67, width: 736 },
      },
    };
    const region = regions[scene.id];
    if (
      !region?.actual ||
      region.actual.width !== region.reference.width ||
      region.actual.height !== region.reference.height
    ) {
      throw new Error(
        `${scene.id}: current rich Markdown region geometry drifted: ${JSON.stringify(region)}.`,
      );
    }
    const referenceRegion = cropPng(
      reference,
      region.reference.left,
      region.reference.top,
      region.reference.width,
      region.reference.height,
    );
    const actualRegion = cropPng(
      actual,
      region.actual.left,
      region.actual.top,
      region.actual.width,
      region.actual.height,
    );
    const comparison = comparePng(referenceRegion, actualRegion, 0.12);
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-product.png`),
      PNG.sync.write(referenceRegion),
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MARKDOWN_STREAM_MAX_DIFF_RATIO",
      0.08,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current rich Markdown pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current rich Markdown pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "conversation-thinking-current-26-825" &&
    currentThinking26825Reference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentThinking26825Reference),
    );
    if (
      reference.width !== currentThinking26825ReferenceSize.width ||
      reference.height !== currentThinking26825ReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height ||
      !currentThinking26825Bounds ||
      currentThinking26825Bounds.left !== 222 ||
      currentThinking26825Bounds.width !== 55 ||
      currentThinking26825Bounds.height !== 21
    ) {
      throw new Error(
        `${scene.id}: current 26.825 Thinking comparison requires exact 1180x820 frames and a 55x21 x=222 label: ${JSON.stringify({ actual: { height: actual.height, width: actual.width }, bounds: currentThinking26825Bounds, reference: { height: reference.height, width: reference.width } })}`,
      );
    }
    const crop = {
      height: 25,
      left: 220,
      width: 80,
    };
    const referenceCrop = cropPng(reference, crop.left, 234, crop.width, crop.height);
    const actualCrop = cropPng(
      actual,
      crop.left,
      currentThinking26825Bounds.top - 2,
      crop.width,
      crop.height,
    );
    const comparison = comparePng(
      foregroundMaskPng(referenceCrop),
      foregroundMaskPng(actualCrop),
      0,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-product.png`),
      PNG.sync.write(referenceCrop),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_THINKING_26_825_MAX_DIFF_RATIO",
      0.04,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualCrop),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.825 Thinking foreground pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.825 Thinking foreground pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "conversation-plan-current-26-825-open" &&
    currentPlan26825Reference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentPlan26825Reference),
    );
    if (
      reference.width !== currentPlan26825ReferenceSize.width ||
      reference.height !== currentPlan26825ReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height ||
      !currentPlan26825Bounds?.tooltip ||
      !currentPlan26825Bounds.trigger ||
      currentPlan26825Bounds.tooltip.top !== 456 ||
      currentPlan26825Bounds.tooltip.bottom !== 656 ||
      currentPlan26825Bounds.tooltip.height !== 200 ||
      Math.abs(currentPlan26825Bounds.tooltip.width - 95.578125) > 0.1 ||
      currentPlan26825Bounds.trigger.top !== 660 ||
      currentPlan26825Bounds.trigger.height !== 38 ||
      Math.abs(currentPlan26825Bounds.trigger.width - 106.671875) > 0.1
    ) {
      throw new Error(
        `${scene.id}: current 26.825 Plan comparison requires exact 1180x820 frames, a 95.578125x200 tooltip, and a 106.671875x38 trigger: ${JSON.stringify({ actual: { height: actual.height, width: actual.width }, bounds: currentPlan26825Bounds, reference: { height: reference.height, width: reference.width } })}`,
      );
    }
    const crop = { height: 255, width: 130 };
    const referenceCrop = cropPng(
      reference,
      686,
      450,
      crop.width,
      crop.height,
    );
    const actualCenter =
      currentPlan26825Bounds.trigger.left +
      currentPlan26825Bounds.trigger.width / 2;
    const actualCrop = cropPng(
      actual,
      Math.round(actualCenter - crop.width / 2),
      currentPlan26825Bounds.tooltip.top - 6,
      crop.width,
      crop.height,
    );
    const comparison = comparePng(
      foregroundMaskPng(referenceCrop, 12),
      foregroundMaskPng(actualCrop, 12),
      0,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-product.png`),
      PNG.sync.write(referenceCrop),
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualCrop),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_PLAN_26_825_MAX_DIFF_RATIO",
      0.045,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.825 Plan foreground pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.825 Plan foreground pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "conversation-search-current-26-825-open" &&
    currentSearch26825Reference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentSearch26825Reference),
    );
    const bounds = currentSearchBrowser26825Bounds?.activity;
    if (
      reference.width !== 1180 ||
      reference.height !== 820 ||
      actual.width !== 1180 ||
      actual.height !== 820 ||
      !bounds
    ) {
      throw new Error(
        `${scene.id}: current 26.825 Search comparison requires exact 1180x820 frames and an activity region.`,
      );
    }
    const crop = { height: 79, width: 420 };
    const referenceCrop = cropPng(
      reference,
      379,
      276,
      crop.width,
      crop.height,
    );
    const actualCrop = cropPng(
      actual,
      bounds.left - 4,
      bounds.top - 4,
      crop.width,
      crop.height,
    );
    const comparison = comparePng(
      foregroundMaskPng(referenceCrop, 12),
      foregroundMaskPng(actualCrop, 12),
      0,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-product.png`),
      PNG.sync.write(referenceCrop),
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualCrop),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_SEARCH_26_825_MAX_DIFF_RATIO",
      0.11,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.825 Search foreground pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.825 Search foreground pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "conversation-browser-current-26-825-open" &&
    currentBrowser26825Reference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentBrowser26825Reference),
    );
    const bounds = currentSearchBrowser26825Bounds?.activity;
    const browserBounds = currentSearchBrowser26825Bounds?.browser;
    if (
      reference.width !== 1180 ||
      reference.height !== 820 ||
      actual.width !== 1180 ||
      actual.height !== 820 ||
      !bounds ||
      !browserBounds ||
      browserBounds.left !== 760 ||
      browserBounds.width !== 420
    ) {
      throw new Error(
        `${scene.id}: current 26.825 Browser comparison requires exact 1180x820 frames, activity geometry, and a 420px Browser side panel.`,
      );
    }
    const activityCrop = { height: 104, width: 413 };
    const referenceActivity = cropPng(
      reference,
      335,
      322,
      activityCrop.width,
      activityCrop.height,
    );
    const actualActivity = cropPng(
      actual,
      bounds.left - 4,
      bounds.top - 4,
      activityCrop.width,
      activityCrop.height,
    );
    const activityComparison = comparePng(
      foregroundMaskPng(referenceActivity, 12),
      foregroundMaskPng(actualActivity, 12),
      0,
    );
    const referenceChrome = cropPng(reference, 760, 0, 420, 86);
    const actualChrome = cropPng(actual, 760, 0, 420, 86);
    const chromeComparison = comparePng(
      referenceChrome,
      actualChrome,
      0.12,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-product.png`),
      PNG.sync.write(referenceActivity),
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualActivity),
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-product-chrome.png`),
      PNG.sync.write(referenceChrome),
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build-chrome.png`),
      PNG.sync.write(actualChrome),
    );
    const maximumActivityRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_BROWSER_26_825_ACTIVITY_MAX_DIFF_RATIO",
      0.1,
    );
    const maximumChromeRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_BROWSER_26_825_CHROME_MAX_DIFF_RATIO",
      0.08,
    );
    if (
      activityComparison.ratio > maximumActivityRatio ||
      chromeComparison.ratio > maximumChromeRatio
    ) {
      throw new Error(
        `${scene.id}: current 26.825 Browser pixel ratios exceed their gates: ${JSON.stringify({ activity: activityComparison.ratio, chrome: chromeComparison.ratio })}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.825 Browser pixel ratios activity=${activityComparison.ratio}, chrome=${chromeComparison.ratio}`,
    );
  }

  if (
    scene.id === "shell-notification-queue" &&
    currentNotificationReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentNotificationReference),
    );
    if (reference.width !== 172 || reference.height !== 42) {
      throw new Error(
        `${scene.id}: current notification reference must be exactly 172x42, received ${reference.width}x${reference.height}.`,
      );
    }
    const currentNotification = cropPng(actual, 666, 48, 172, 42);
    const comparison = comparePng(reference, currentNotification, 0.12);
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_NOTIFICATION_MAX_DIFF_RATIO",
      0.015,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(currentNotification),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current notification pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current notification pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "shell-notification-success-stack" &&
    currentNotificationStackReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentNotificationStackReference),
    );
    if (reference.width !== 172 || reference.height !== 64) {
      throw new Error(
        `${scene.id}: current notification stack reference must be exactly 172x64, received ${reference.width}x${reference.height}.`,
      );
    }
    const currentNotificationStack = cropPng(actual, 666, 48, 172, 64);
    const comparison = comparePng(
      reference,
      currentNotificationStack,
      0.12,
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_NOTIFICATION_STACK_MAX_DIFF_RATIO",
      0.01,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(currentNotificationStack),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current notification stack pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current notification stack pixel ratio ${comparison.ratio}`,
    );
  }

  const diff = new PNG({ height: actual.height, width: actual.width });
  const pixels = pixelmatch(
    baseline.data,
    actual.data,
    diff.data,
    actual.width,
    actual.height,
    {
      includeAA: false,
      threshold: 0.12,
    },
  );
  if (pixels > 0) await writeFile(diffPath, PNG.sync.write(diff));
  if (actual.width <= internalSidebarWidth) {
    throw new Error(
      `${scene.id}: frame width ${actual.width}px cannot be split at the ${internalSidebarWidth}px sidebar boundary.`,
    );
  }
  const mainComparison = comparePng(
    cropPng(
      baseline,
      internalSidebarWidth,
      0,
      baseline.width - internalSidebarWidth,
      baseline.height,
    ),
    cropPng(
      actual,
      internalSidebarWidth,
      0,
      actual.width - internalSidebarWidth,
      actual.height,
    ),
    0.12,
  );
  const sidebarComparison = comparePng(
    cropPng(baseline, 0, 0, internalSidebarWidth, baseline.height),
    cropPng(actual, 0, 0, internalSidebarWidth, actual.height),
    0.12,
  );
  const maximumMainPixelRatio =
    scene.maxPixelRatio ?? defaultLifecycleMainPixelRatio;
  if (
    mainComparison.ratio > maximumMainPixelRatio ||
    sidebarComparison.ratio > defaultLifecycleSidebarPixelRatio
  ) {
    const failure =
      `${scene.id}: regional pixel drift ${JSON.stringify({
        main: mainComparison.ratio,
        sidebar: sidebarComparison.ratio,
      })} exceeds ${JSON.stringify({
        main: maximumMainPixelRatio,
        sidebar: defaultLifecycleSidebarPixelRatio,
      })}.`;
    regionalFailures.push(failure);
    console.error(failure);
    continue;
  }

  if (
    scene.id === "app-server-crashed" &&
    currentBuildAppServerCrashReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildAppServerCrashReference)),
      { blue: 0, green: 0, red: 0 },
    );
    const flattenedActual = flattenPng(clonePng(actual), {
      blue: 0,
      green: 0,
      red: 0,
    });
    if (
      reference.width !== currentBuildAppServerCrashReferenceSize.width ||
      reference.height !== currentBuildAppServerCrashReferenceSize.height ||
      flattenedActual.width !== reference.width ||
      flattenedActual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current-build App Server crash comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${flattenedActual.width}x${flattenedActual.height}.`,
      );
    }
    const fullComparison = comparePng(reference, flattenedActual, 0.1);
    const core = { height: 185, left: 350, top: 320, width: 480 };
    const coreComparison = comparePng(
      cropPng(reference, core.left, core.top, core.width, core.height),
      cropPng(
        flattenedActual,
        core.left,
        core.top,
        core.width,
        core.height,
      ),
      0.1,
    );
    const maximumFullRatio = environmentRatio(
      "CODEX_UI_KIT_APP_SERVER_CRASH_MAX_DIFF_RATIO",
      0.002,
    );
    const maximumCoreRatio = environmentRatio(
      "CODEX_UI_KIT_APP_SERVER_CRASH_CORE_MAX_DIFF_RATIO",
      0.02,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(flattenedActual),
    );
    if (fullComparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(fullComparison.diff),
      );
    }
    if (
      fullComparison.ratio > maximumFullRatio ||
      coreComparison.ratio > maximumCoreRatio
    ) {
      throw new Error(
        `${scene.id}: current-build App Server crash ratios ${JSON.stringify({ core: coreComparison.ratio, full: fullComparison.ratio })} exceed ${JSON.stringify({ core: maximumCoreRatio, full: maximumFullRatio })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build App Server crash ratios ${JSON.stringify({ core: coreComparison.ratio, full: fullComparison.ratio })}`,
    );
  }

  if (scene.id === "current-basic-thread" && currentBasicThreadReference) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: currentBasicThreadBounds,
      defaultMaximumRatio: 0.005,
      expectedActualPosition: { left: 343, top: 46 },
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_BASIC_THREAD_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 774,
        left: 0,
        top: 0,
        width: 768,
      },
      referencePath: currentBasicThreadReference,
      referenceSize: currentBasicThreadReferenceSize,
      sceneId: scene.id,
    });
  }

  const currentBasic26825Reference =
    currentBasic26825References[scene.id];
  if (currentBasic26825Reference) {
    const regions = {
      "current-basic-26-825-boundary-open": {
        composer: { height: 98, left: 339, top: 566, width: 366 },
        header: { height: 47, left: 322, top: 0, width: 399 },
        thread: { height: 168, left: 339, top: 75, width: 366 },
      },
      "current-basic-26-825-compact": {
        composer: { height: 98, left: 17, top: 566, width: 687 },
        header: { height: 47, left: 0, top: 0, width: 720 },
        thread: { height: 150, left: 17, top: 75, width: 687 },
      },
      "current-basic-26-825-wide": {
        composer: { height: 98, left: 383, top: 706, width: 737 },
        header: { height: 47, left: 322, top: 0, width: 858 },
        thread: { height: 150, left: 383, top: 75, width: 737 },
      },
    }[scene.id];
    await compareCurrentBasic26825({
      actual,
      referencePath: currentBasic26825Reference,
      regions,
      sceneId: scene.id,
    });
  }

  const currentCommand26825Reference =
    currentCommand26825References[scene.id];
  if (currentCommand26825Reference) {
    const regions = scene.id.endsWith("-compact")
      ? {
          activity: { height: 145, left: 16, top: 205, width: 688 },
          composer: { height: 120, left: 16, top: 560, width: 688 },
          header: { height: 47, left: 0, top: 0, width: 720 },
        }
      : {
          activity: { height: 145, left: 222, top: 205, width: 736 },
          composer: { height: 120, left: 222, top: 700, width: 736 },
          header: { height: 47, left: 0, top: 0, width: 1180 },
        };
    await compareCurrentCommand26825({
      actual,
      referencePath: currentCommand26825Reference,
      regions,
      sceneId: scene.id,
    });
  }

  const currentReview26825Reference =
    currentReview26825References[scene.id];
  if (currentReview26825Reference) {
    const regions = {
      "current-review-26-825-file-card": {
        card: { height: 178, left: 222, top: 358, width: 737 },
      },
      "current-review-26-825-file-card-compact": {
        card: { height: 177, left: 16, top: 313, width: 688 },
      },
      "current-review-26-825-files": {
        card: { height: 177, left: 16, top: 404, width: 556 },
        panel: { height: 820, left: 588, top: 0, width: 592 },
      },
      "current-review-26-825-files-compact": {
        panel: { height: 680, left: 375, top: 0, width: 345 },
      },
    }[scene.id];
    await compareCurrentReview26825({
      actual,
      referencePath: currentReview26825Reference,
      regions,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "current-command-failure-expanded" &&
    currentCommandFailureReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: currentCommandFailureBounds,
      defaultMaximumRatio: 0.05,
      expectedActualPosition: { left: 222, top: 273 },
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_COMMAND_FAILURE_26_818_MAX_DIFF_RATIO",
      referenceCrop: { height: 253, left: 222, top: 273, width: 736 },
      referencePath: currentCommandFailureReference,
      referenceSize: currentCommandLifecycleReferenceSize,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "current-command-interruption-recovered" &&
    currentCommandInterruptionReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: currentCommandInterruptionBounds,
      defaultMaximumRatio: 0.045,
      expectedActualPosition: { left: 222, top: 451 },
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_COMMAND_INTERRUPTION_26_818_MAX_DIFF_RATIO",
      referenceCrop: { height: 211, left: 222, top: 451, width: 736 },
      referencePath: currentCommandInterruptionReference,
      referenceSize: currentCommandLifecycleReferenceSize,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "command-current-26-820-success-completed" &&
    currentCommand26820SuccessReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentCommand26820SuccessReference),
    );
    if (
      reference.width !== currentCommand26820WideReferenceSize.width ||
      reference.height !== currentCommand26820WideReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current 26.820 command success comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 222, 307, 736, 130),
      cropPng(actual, 222, 308, 736, 130),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_COMMAND_SUCCESS_26_820_MAX_DIFF_RATIO",
      0.02,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.820 command success region ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.820 command success region pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "command-current-26-820-failure-recovered" &&
    currentCommand26820FailureReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentCommand26820FailureReference),
    );
    if (
      reference.width !== currentCommand26820WideReferenceSize.width ||
      reference.height !== currentCommand26820WideReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current 26.820 command failure comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 206, 302, 736, 125),
      cropPng(actual, 222, 303, 736, 125),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_COMMAND_FAILURE_26_820_MAX_DIFF_RATIO",
      0.02,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.820 command failure region ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.820 command failure region pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "command-current-26-820-interruption-stopped-immediate" &&
    currentCommand26820InterruptionStoppedReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentCommand26820InterruptionStoppedReference),
    );
    if (
      reference.width !== currentCommand26820WideReferenceSize.width ||
      reference.height !== currentCommand26820WideReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current 26.820 stopped-command comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 222, 282, 736, 74),
      cropPng(actual, 222, 283, 736, 74),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_COMMAND_INTERRUPTION_STOPPED_26_820_MAX_DIFF_RATIO",
      0.055,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.820 stopped-command region ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.820 stopped-command region pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "command-current-26-820-interruption-compact" &&
    currentCommand26820InterruptionCompactReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentCommand26820InterruptionCompactReference),
    );
    if (
      reference.width !== currentCommand26820CompactReferenceSize.width ||
      reference.height !== currentCommand26820CompactReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current 26.820 compact interruption comparison requires exact 720x680 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 16, 294, 688, 242),
      cropPng(actual, 16, 291, 688, 242),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_COMMAND_INTERRUPTION_RECOVERY_26_820_COMPACT_MAX_DIFF_RATIO",
      0.03,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.820 compact interruption region ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.820 compact interruption region pixel ratio ${comparison.ratio}`,
    );
  }

  if (scene.id === "workspace-ready" && currentBuildWorkspaceReference) {
    const referenceFull = flattenPng(
      PNG.sync.read(await readFile(currentBuildWorkspaceReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      referenceFull.width !== currentBuildWorkspaceReferenceSize.width ||
      referenceFull.height !== currentBuildWorkspaceReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build workspace reference must be exactly ${currentBuildWorkspaceReferenceSize.width}x${currentBuildWorkspaceReferenceSize.height}, received ${referenceFull.width}x${referenceFull.height}.`,
      );
    }
    if (
      actual.width !== referenceFull.width ||
      actual.height !== referenceFull.height
    ) {
      throw new Error(
        `${scene.id}: current-build workspace comparison requires matching ${referenceFull.width}x${referenceFull.height} frames.`,
      );
    }
    const reference = cropPng(
      referenceFull,
      internalSidebarWidth,
      0,
      referenceFull.width - internalSidebarWidth,
      referenceFull.height,
    );
    const workspaceActual = cropPng(
      actual,
      internalSidebarWidth,
      0,
      actual.width - internalSidebarWidth,
      actual.height,
    );
    const masks = [
      {
        height: 72,
        left: 170,
        top: 350,
        width: 620,
      },
      {
        height: 54,
        left: 100,
        top: 596,
        width: 706,
      },
      {
        height: 22,
        left: 134,
        top: 676,
        width: 94,
      },
      {
        height: 22,
        left: 252,
        top: 676,
        width: 38,
      },
      {
        height: 22,
        left: 330,
        top: 676,
        width: 174,
      },
      {
        height: 24,
        left: 155,
        top: 768,
        width: 149,
      },
      {
        height: 24,
        left: 606,
        top: 768,
        width: 112,
      },
    ];
    // Align only the recorded integration band: the reference is a main-only
    // crop and the playground retains its 274px application sidebar.
    const comparison = comparePng(
      maskPng(reference, masks),
      maskPng(workspaceActual, masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_WORKSPACE_MAX_DIFF_RATIO",
      0.075,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(workspaceActual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build workspace pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build workspace pixel ratio ${comparison.ratio}`,
    );

    if (
      JSON.stringify(workspaceCurrentIconBounds) !==
      JSON.stringify(currentBuildComposerIconReferenceBounds)
    ) {
      throw new Error(
        `${scene.id}: current Composer icon bounds drifted from the current-build reference: ${JSON.stringify(workspaceCurrentIconBounds)}.`,
      );
    }
    const iconComparisons = currentBuildComposerIconReferenceBounds.map(
      (referenceBounds) => {
        return {
          comparison: comparePng(
            cropPng(
              referenceFull,
              referenceBounds.left,
              referenceBounds.top,
              referenceBounds.width,
              referenceBounds.height,
            ),
            cropPng(
              actual,
              referenceBounds.left,
              referenceBounds.top,
              referenceBounds.width,
              referenceBounds.height,
            ),
            0.12,
          ),
          name: referenceBounds.name,
        };
      },
    );
    const composerIconPixels = iconComparisons.reduce(
      (total, { comparison: iconComparison }) =>
        total + iconComparison.pixels,
      0,
    );
    const composerIconArea = currentBuildComposerIconReferenceBounds.reduce(
      (total, { height, width }) => total + height * width,
      0,
    );
    const composerIconRatio = composerIconPixels / composerIconArea;
    const maximumComposerIconRatio = environmentRatio(
      "CODEX_UI_KIT_COMPOSER_ICON_MAX_DIFF_RATIO",
      0.16,
    );
    for (const { comparison: iconComparison, name } of iconComparisons) {
      if (iconComparison.pixels > 0) {
        await writeFile(
          join(
            artifactDirectory,
            `${scene.id}.current-build.${name}.diff.png`,
          ),
          PNG.sync.write(iconComparison.diff),
        );
      }
      if (iconComparison.ratio > maximumComposerIconRatio) {
        throw new Error(
          `${scene.id}: current-build Composer icon ${name} pixel ratio ${iconComparison.ratio} exceeds ${maximumComposerIconRatio}.`,
        );
      }
    }
    if (composerIconRatio > maximumComposerIconRatio) {
      throw new Error(
        `${scene.id}: current-build Composer icon pixel ratio ${composerIconRatio} exceeds ${maximumComposerIconRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build Composer icon pixel ratio ${composerIconRatio}`,
    );
  }

  const currentHomeReference = {
    "current-dark-shell": currentDarkShellReference,
    "current-light-shell": currentLightShellReference,
    "current-dark-shell-compact": currentDarkShellCompactReference,
    "current-light-shell-compact": currentLightShellCompactReference,
  }[scene.id];
  if (currentHomeReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentHomeReference)),
      scene.theme === "light"
        ? { blue: 255, green: 255, red: 255 }
        : { blue: 24, green: 24, red: 24 },
    );
    const compact = scene.id.endsWith("-compact");
    const referenceSize = compact
      ? { height: 680, width: 720 }
      : currentBuildWorkspaceReferenceSize;
    if (
      reference.width !== referenceSize.width ||
      reference.height !== referenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current-build home comparison requires matching ${referenceSize.width}x${referenceSize.height} frames.`,
      );
    }
    const mainBounds = compact
      ? { height: 634, left: 323, top: 46, width: 397 }
      : { height: 774, left: 323, top: 46, width: 857 };
    const comparison = comparePng(
      cropPng(
        reference,
        mainBounds.left,
        mainBounds.top,
        mainBounds.width,
        mainBounds.height,
      ),
      cropPng(
        actual,
        mainBounds.left,
        mainBounds.top,
        mainBounds.width,
        mainBounds.height,
      ),
      0.12,
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.main.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_HOME_MAIN_MAX_DIFF_RATIO",
      0.025,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build home main pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build home main pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    (scene.id === "projects-index-ready" ||
      scene.id === "projects-index-route-continuity") &&
    currentProjectsIndexReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentProjectsIndexReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentProjectsIndexReferenceSize.width ||
      reference.height !== currentProjectsIndexReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current-build Projects comparison requires matching 1180x820 frames.`,
      );
    }
    const rowMasks = Array.from({ length: 9 }, (_value, index) => [
      {
        height: 38,
        left: 50,
        top: 174 + index * 71 + 16,
        width: 310,
      },
      {
        height: 38,
        left: 535,
        top: 174 + index * 71 + 16,
        width: 75,
      },
      {
        height: 38,
        left: 684,
        top: 174 + index * 71 + 16,
        width: 36,
      },
    ]).flat();
    const comparisons = {
      ...(scene.id === "projects-index-route-continuity"
        ? {
            chrome: comparePng(
              cropPng(reference, 82, 0, 102, 46),
              cropPng(actual, 82, 0, 102, 46),
            ),
          }
        : {}),
      create: comparePng(
        cropPng(reference, 1102, 0, 78, 46),
        cropPng(actual, 1102, 0, 78, 46),
      ),
      route: comparePng(
        maskPng(cropPng(reference, 367, 46, 768, 774), rowMasks),
        maskPng(cropPng(actual, 343, 46, 768, 774), rowMasks),
      ),
    };
    const limits = {
      chrome: environmentRatio(
        "CODEX_UI_KIT_CURRENT_ROUTE_CHROME_MAX_DIFF_RATIO",
        0.04,
      ),
      create: environmentRatio(
        "CODEX_UI_KIT_CURRENT_PROJECTS_CREATE_MAX_DIFF_RATIO",
        scene.id === "projects-index-route-continuity" ? 0.055 : 0.04,
      ),
      route: environmentRatio(
        "CODEX_UI_KIT_CURRENT_PROJECTS_ROUTE_MAX_DIFF_RATIO",
        0.035,
      ),
    };
    for (const [region, comparison] of Object.entries(comparisons)) {
      if (comparison.pixels > 0) {
        await writeFile(
          join(
            artifactDirectory,
            `${scene.id}.current-build.${region}.diff.png`,
          ),
          PNG.sync.write(comparison.diff),
        );
      }
      if (comparison.ratio > limits[region]) {
        throw new Error(
          `${scene.id}: current-build Projects ${region} pixel ratio ${comparison.ratio} exceeds ${limits[region]}.`,
        );
      }
    }
    console.log(
      `${scene.id}: current-build Projects pixel ratios ${JSON.stringify(Object.fromEntries(Object.entries(comparisons).map(([region, comparison]) => [region, comparison.ratio])))}`,
    );
  }

  if (
    scene.id === "workspace-new-worktree" &&
    currentBuildWorkspaceNewWorktreeReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.02,
      masks: [
        { height: 820, left: 0, top: 0, width: 274 },
        { height: 52, left: 480, top: 350, width: 500 },
        { height: 92, left: 406, top: 558, width: 650 },
        { height: 28, left: 402, top: 672, width: 470 },
        { height: 24, left: 367, top: 716, width: 180 },
        { height: 28, left: 398, top: 767, width: 150 },
        { height: 28, left: 870, top: 767, width: 185 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_NEW_WORKTREE_MAX_DIFF_RATIO",
      referencePath: currentBuildWorkspaceNewWorktreeReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-directory-missing" &&
    currentBuildWorkspaceDirectoryMissingReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(currentBuildWorkspaceDirectoryMissingReference),
      ),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !==
        currentBuildWorkspaceDirectoryMissingReferenceSize.width ||
      reference.height !==
        currentBuildWorkspaceDirectoryMissingReferenceSize.height ||
      actual.width !== 1180 ||
      actual.height !== 820
    ) {
      throw new Error(
        `${scene.id}: current-build missing-directory comparison requires a 2560x1326 reference and 1180x820 playground frame.`,
      );
    }
    const referenceNotice = cropPng(reference, 1049, 1059, 736, 37);
    const actualNotice = cropPng(actual, 359, 661, 736, 37);
    const comparison = comparePng(referenceNotice, actualNotice, 0.08);
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_WORKSPACE_DIRECTORY_MISSING_MAX_DIFF_RATIO",
      0.04,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualNotice),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build missing-directory notice pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build missing-directory notice pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "workspace-no-project" &&
    currentBuildWorkspaceNoProjectReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.02,
      masks: [
        { height: 820, left: 0, top: 0, width: 274 },
        { height: 52, left: 520, top: 350, width: 430 },
        { height: 28, left: 402, top: 672, width: 160 },
        { height: 24, left: 367, top: 716, width: 180 },
        { height: 28, left: 398, top: 767, width: 150 },
        { height: 28, left: 870, top: 767, width: 185 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_NO_PROJECT_MAX_DIFF_RATIO",
      referencePath: currentBuildWorkspaceNoProjectReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-compact-ready" &&
    currentBuildWorkspaceCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.025,
      masks: [
        { height: 42, left: 125, top: 290, width: 480 },
        { height: 90, left: 62, top: 420, width: 610 },
        { height: 28, left: 58, top: 532, width: 400 },
        { height: 24, left: 26, top: 576, width: 180 },
        { height: 28, left: 56, top: 627, width: 150 },
        { height: 28, left: 480, top: 627, width: 185 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_COMPACT_MAX_DIFF_RATIO",
      referencePath: currentBuildWorkspaceCompactReference,
      sceneId: scene.id,
    });
  }

  const workspaceProjectReference =
    scene.id === "workspace-project-menu-compact"
      ? currentBuildWorkspaceProjectCompactReference ??
        currentBuildWorkspaceProjectReference
      : currentBuildWorkspaceProjectReference;
  if (
    (scene.id === "workspace-project-menu" ||
      scene.id === "workspace-project-menu-compact") &&
    workspaceProjectReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(workspaceProjectReference),
      ),
      { blue: 48, green: 48, red: 48 },
    );
    if (
      reference.width !== currentBuildWorkspaceProjectReferenceSize.width ||
      reference.height !== currentBuildWorkspaceProjectReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build project reference must be exactly ${currentBuildWorkspaceProjectReferenceSize.width}x${currentBuildWorkspaceProjectReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      !workspaceProjectListboxBounds ||
      workspaceProjectListboxBounds.width !== reference.width ||
      workspaceProjectListboxBounds.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: project listbox bounds do not match the current-build reference: ${JSON.stringify(workspaceProjectListboxBounds)}.`,
      );
    }
    const projectActual = cropPng(
      actual,
      workspaceProjectListboxBounds.left,
      workspaceProjectListboxBounds.top,
      workspaceProjectListboxBounds.width,
      workspaceProjectListboxBounds.height,
    );
    const masks = Array.from({ length: 5 }, (_, index) => ({
      height: 20,
      left: 25,
      top: Math.round(index * 28.5 + 4),
      width: 190,
    }));
    // The product card begins 12px outside the compact viewport. Compare the
    // shared visible interior against the same card-relative playground span.
    const comparison = comparePng(
      maskPng(reference, masks),
      maskPng(projectActual, masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_WORKSPACE_PROJECT_MAX_DIFF_RATIO",
      0.05,
    );
    await writeFile(
      join(
        artifactDirectory,
        `${scene.id}.current-build.png`,
      ),
      PNG.sync.write(projectActual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build project list pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build project list pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "workspace-environment-menu" &&
    currentBuildWorkspaceEnvironmentReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: workspaceEnvironmentMenuBounds,
      defaultMaximumRatio: 0.05,
      masks: [
        { height: 18, left: 12, top: 10, width: 96 },
        ...[39, 68, 97, 126, 163].map((top) => ({
          height: 18,
          left: 34,
          top,
          width: 142,
        })),
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 189,
        left: 0,
        top: 0,
        width: 216,
      },
      referencePath: currentBuildWorkspaceEnvironmentReference,
      referenceSize: { height: 190, width: 216 },
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-environment-picker" &&
    currentBuildWorkspaceEnvironmentPickerReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: workspaceEnvironmentPickerBounds,
      defaultMaximumRatio: 0.05,
      masks: [
        { height: 18, left: 12, top: 10, width: 96 },
        { height: 18, left: 34, top: 39, width: 180 },
        { height: 18, left: 12, top: 68, width: 180 },
        { height: 18, left: 34, top: 97, width: 180 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_PICKER_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 126,
        left: 0,
        top: 0,
        width: 264,
      },
      referencePath: currentBuildWorkspaceEnvironmentPickerReference,
      referenceSize: { height: 126, width: 264 },
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-environments-unavailable" &&
    currentBuildWorkspaceEnvironmentSettingsReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: workspaceEnvironmentSettingsBounds,
      defaultMaximumRatio: 0.04,
      masks: [
        { height: 24, left: 0, top: 16, width: 220 },
        { height: 22, left: 0, top: 87, width: 250 },
        { height: 40, left: 1, top: 128, width: 766 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_ENVIRONMENT_SETTINGS_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 171,
        left: 44,
        top: 0,
        width: 768,
      },
      referencePath: currentBuildWorkspaceEnvironmentSettingsReference,
      referenceSize: { height: 774, width: 857 },
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-worktree-menu" &&
    currentBuildWorkspaceWorktreeReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: workspaceWorktreeMenuBounds,
      defaultMaximumRatio: 0.08,
      masks: [
        { height: 18, left: 14, top: 11, width: 170 },
        { height: 18, left: 14, top: 55, width: 90 },
        { height: 18, left: 36, top: 83, width: 210 },
        { height: 18, left: 36, top: 112, width: 210 },
        { height: 20, left: 36, top: 250, width: 230 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_WORKTREE_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 280,
        left: 569,
        top: 392,
        width: 296,
      },
      referencePath: currentBuildWorkspaceWorktreeReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-branch-create" &&
    currentBuildWorkspaceBranchCreateReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: workspaceBranchCreateBounds,
      defaultMaximumRatio: 0.08,
      expectedActualPosition: { left: 390, top: 315 },
      masks: [
        { height: 30, left: 18, top: 20, width: 330 },
        { height: 19, left: 18, top: 61, width: 344 },
        { height: 24, left: 28, top: 96, width: 120 },
        { height: 22, left: 130, top: 141, width: 238 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_WORKSPACE_BRANCH_CREATE_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 191,
        left: 390,
        top: 315,
        width: 400,
      },
      referencePath: currentBuildWorkspaceBranchCreateReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-git-settings" &&
    currentBuildGitSettingsReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.042,
      masks: [
        { height: 24, left: 43, top: 87, width: 263 },
        { height: 630, left: 36, top: 133, width: 278 },
        { height: 42, left: 366, top: 60, width: 190 },
        { height: 290, left: 366, top: 126, width: 455 },
        { height: 22, left: 900, top: 147, width: 205 },
        { height: 102, left: 380, top: 548, width: 740 },
        { height: 42, left: 366, top: 696, width: 290 },
        { height: 42, left: 366, top: 754, width: 410 },
      ],
      maximumRatioName: "CODEX_UI_KIT_GIT_SETTINGS_MAX_DIFF_RATIO",
      referencePath: currentBuildGitSettingsReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-git-settings-compact" &&
    currentBuildGitSettingsCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.05,
      masks: [
        { height: 24, left: 43, top: 87, width: 263 },
        { height: 510, left: 36, top: 133, width: 278 },
        { height: 42, left: 342, top: 60, width: 190 },
        { height: 290, left: 342, top: 126, width: 190 },
        { height: 22, left: 542, top: 147, width: 145 },
        { height: 102, left: 354, top: 548, width: 333 },
        { height: 42, left: 342, top: 696, width: 290 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_GIT_SETTINGS_COMPACT_MAX_DIFF_RATIO",
      referencePath: currentBuildGitSettingsCompactReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-appearance-settings" &&
    currentBuildAppearanceSettingsReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.045,
      masks: [
        { height: 24, left: 43, top: 87, width: 263 },
        { height: 630, left: 36, top: 133, width: 278 },
        { height: 171, left: 369, top: 175, width: 244 },
        { height: 171, left: 629, top: 175, width: 244 },
        { height: 171, left: 889, top: 175, width: 244 },
        { height: 106, left: 369, top: 391, width: 764 },
        { height: 264, left: 382, top: 573, width: 737 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_APPEARANCE_SETTINGS_MAX_DIFF_RATIO",
      referencePath: currentBuildAppearanceSettingsReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-appearance-settings-compact" &&
    currentBuildAppearanceSettingsCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.055,
      masks: [
        { height: 24, left: 43, top: 87, width: 263 },
        { height: 510, left: 36, top: 133, width: 278 },
        { height: 74, left: 345, top: 175, width: 106 },
        { height: 74, left: 468, top: 175, width: 106 },
        { height: 74, left: 591, top: 175, width: 106 },
        { height: 106, left: 345, top: 296, width: 353 },
        { height: 248, left: 358, top: 477, width: 325 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_APPEARANCE_SETTINGS_COMPACT_MAX_DIFF_RATIO",
      referencePath: currentBuildAppearanceSettingsCompactReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-appearance-settings-preferences" &&
    currentBuildAppearanceSettingsPreferencesReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.045,
      masks: [
        { height: 24, left: 43, top: 87, width: 263 },
        { height: 630, left: 36, top: 133, width: 278 },
        { height: 47, left: 1012, top: 435, width: 108 },
        { height: 234, left: 382, top: 374, width: 737 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_APPEARANCE_SETTINGS_PREFERENCES_MAX_DIFF_RATIO",
      referencePath: currentBuildAppearanceSettingsPreferencesReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-general-settings" &&
    currentBuildGeneralSettingsReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.052,
      masks: [
        // The captured current-product frame retained a transient pointer hover
        // on Hooks while General remained the active route.
        { height: 30, left: 8, top: 715, width: 306 },
        // Projectless task folders are user-specific; geometry and controls
        // remain covered while the account path itself is excluded.
        { height: 32, left: 840, top: 438, width: 195 },
      ],
      maximumRatioName: "CODEX_UI_KIT_GENERAL_SETTINGS_MAX_DIFF_RATIO",
      referencePath: currentBuildGeneralSettingsReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-general-settings-compact" &&
    currentBuildGeneralSettingsCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.072,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_GENERAL_SETTINGS_COMPACT_MAX_DIFF_RATIO",
      referenceCrop: { height: 680, left: 0, top: 0, width: 720 },
      referencePath: currentBuildGeneralSettingsCompactReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-general-settings-hotkey" &&
    currentBuildGeneralSettingsHotkeyReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.052,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_GENERAL_SETTINGS_HOTKEY_MAX_DIFF_RATIO",
      referencePath: currentBuildGeneralSettingsHotkeyReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-general-settings-bottom" &&
    currentBuildGeneralSettingsBottomReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.052,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_GENERAL_SETTINGS_BOTTOM_MAX_DIFF_RATIO",
      referencePath: currentBuildGeneralSettingsBottomReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-personalization-settings" &&
    currentBuildPersonalizationSettingsReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual: cropPng(actual, 367, 66, 768, 692),
      defaultMaximumRatio: 0.055,
      masks: [{ height: 150, left: 0, top: 117, width: 768 }],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_PERSONALIZATION_26_825_MAX_DIFF_RATIO",
      referenceCrop: { height: 692, left: 0, top: 0, width: 768 },
      referencePath: currentBuildPersonalizationSettingsReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-personalization-settings-menu" &&
    currentBuildPersonalizationSettingsMenuReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.055,
      masks: [{ height: 150, left: 367, top: 183, width: 768 }],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_PERSONALIZATION_26_825_MENU_MAX_DIFF_RATIO",
      referencePath: currentBuildPersonalizationSettingsMenuReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-personalization-settings-compact" &&
    currentBuildPersonalizationSettingsCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual: cropPng(actual, 342, 46, 358, 634),
      defaultMaximumRatio: 0.08,
      masks: [{ height: 150, left: 0, top: 155, width: 358 }],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_PERSONALIZATION_26_825_COMPACT_MAX_DIFF_RATIO",
      referencePath: currentBuildPersonalizationSettingsCompactReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-keyboard-shortcuts" &&
    currentBuildKeyboardSettingsReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.06,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_KEYBOARD_26_825_MAX_DIFF_RATIO",
      referencePath: currentBuildKeyboardSettingsReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-keyboard-shortcuts-search" &&
    currentBuildKeyboardSettingsSearchReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.06,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_KEYBOARD_26_825_SEARCH_MAX_DIFF_RATIO",
      referencePath: currentBuildKeyboardSettingsSearchReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-keyboard-shortcuts-compact" &&
    currentBuildKeyboardSettingsCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.08,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_KEYBOARD_26_825_COMPACT_MAX_DIFF_RATIO",
      referencePath: currentBuildKeyboardSettingsCompactReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-voice-settings" &&
    currentBuildVoiceSettingsReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.055,
      masks: [],
      maximumRatioName: "CODEX_UI_KIT_CURRENT_VOICE_26_825_MAX_DIFF_RATIO",
      referencePath: currentBuildVoiceSettingsReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-voice-settings-microphone-menu" &&
    currentBuildVoiceSettingsMicrophoneReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.055,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_VOICE_26_825_MICROPHONE_MAX_DIFF_RATIO",
      referencePath: currentBuildVoiceSettingsMicrophoneReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-voice-settings-picker" &&
    currentBuildVoiceSettingsPickerReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.06,
      masks: [{ height: 144, left: 518, top: 290, width: 144 }],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_VOICE_26_825_PICKER_MAX_DIFF_RATIO",
      referencePath: currentBuildVoiceSettingsPickerReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-voice-settings-compact" &&
    currentBuildVoiceSettingsCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.075,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_VOICE_26_825_COMPACT_MAX_DIFF_RATIO",
      referencePath: currentBuildVoiceSettingsCompactReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-usage-settings" &&
    currentBuildUsageSettingsReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.045,
      masks: [
        // The native Settings rail is translucent over host content. The
        // public page owns the stable 768px Usage content to its right.
        { height: 820, left: 0, top: 0, width: 322 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_USAGE_26_825_MAX_DIFF_RATIO",
      referencePath: currentBuildUsageSettingsReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-usage-settings-bottom" &&
    currentBuildUsageSettingsBottomReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.055,
      masks: [{ height: 820, left: 0, top: 0, width: 322 }],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_USAGE_26_825_BOTTOM_MAX_DIFF_RATIO",
      referencePath: currentBuildUsageSettingsBottomReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-usage-settings-compact" &&
    currentBuildUsageSettingsCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.05,
      masks: [{ height: 680, left: 0, top: 0, width: 322 }],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_USAGE_26_825_COMPACT_MAX_DIFF_RATIO",
      referencePath: currentBuildUsageSettingsCompactReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-usage-settings-compact-bottom" &&
    currentBuildUsageSettingsCompactBottomReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.05,
      masks: [{ height: 680, left: 0, top: 0, width: 322 }],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_USAGE_26_825_COMPACT_BOTTOM_MAX_DIFF_RATIO",
      referencePath: currentBuildUsageSettingsCompactBottomReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-plan-settings-personal" &&
    currentBuildPlanSettingsPersonalReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.035,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_PLAN_SETTINGS_26_825_PERSONAL_MAX_DIFF_RATIO",
      referencePath: currentBuildPlanSettingsPersonalReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-plan-settings-business" &&
    currentBuildPlanSettingsBusinessReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.065,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_PLAN_SETTINGS_26_825_BUSINESS_MAX_DIFF_RATIO",
      referencePath: currentBuildPlanSettingsBusinessReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-plan-settings-compact" &&
    currentBuildPlanSettingsCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.07,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_PLAN_SETTINGS_26_825_COMPACT_MAX_DIFF_RATIO",
      referencePath: currentBuildPlanSettingsCompactReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-worktree-settings" &&
    currentBuildWorktreeSettingsReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual: cropPng(actual, 367, 66, 768, 548),
      defaultMaximumRatio: 0.05,
      masks: [
        { height: 24, left: 0, top: 376, width: 700 },
        { height: 18, left: 12, top: 460, width: 470 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_26_825_WORKTREE_SETTINGS_MAX_DIFF_RATIO",
      referenceCrop: { height: 548, left: 367, top: 66, width: 768 },
      referencePath: currentBuildWorktreeSettingsReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-hooks-settings" &&
    currentBuildHooksSettingsReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.03,
      masks: [],
      maximumRatioName: "CODEX_UI_KIT_HOOKS_SETTINGS_MAX_DIFF_RATIO",
      referencePath: currentBuildHooksSettingsReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "workspace-hooks-settings-compact" &&
    currentBuildHooksSettingsCompactReference
  ) {
    await compareCurrentBuildWorkspaceFrame({
      actual,
      defaultMaximumRatio: 0.04,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_HOOKS_SETTINGS_COMPACT_MAX_DIFF_RATIO",
      referenceCrop: { height: 680, left: 0, top: 0, width: 720 },
      referencePath: currentBuildHooksSettingsCompactReference,
      sceneId: scene.id,
    });
  }

  if (scene.id === "current-sidebar" && currentBuildSidebarReference) {
    if (!Number.isInteger(sidebarSelectedTop)) {
      throw new Error(
        `${scene.id}: current sidebar row position was not captured.`,
      );
    }
    const referenceFull = flattenPng(
      PNG.sync.read(await readFile(currentBuildSidebarReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      referenceFull.width !== currentBuildSidebarReferenceSize.width ||
      referenceFull.height !== currentBuildSidebarReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build sidebar reference must be exactly ${currentBuildSidebarReferenceSize.width}x${currentBuildSidebarReferenceSize.height}, received ${referenceFull.width}x${referenceFull.height}.`,
      );
    }
    if (
      actual.width !== referenceFull.width ||
      actual.height !== referenceFull.height
    ) {
      throw new Error(
        `${scene.id}: sidebar comparison requires matching ${referenceFull.width}x${referenceFull.height} frames.`,
      );
    }

    const referenceTop = cropPng(referenceFull, 0, 0, 274, 250);
    const actualTop = cropPng(actual, 0, 0, 274, 250);
    const topComparison = comparePng(referenceTop, actualTop);

    const selectedMasks = [
      { height: 22, left: 8, top: 4, width: 242 },
    ];
    const referenceSelected = maskPng(
      cropPng(referenceFull, 8, 426, 258, 30),
      selectedMasks,
    );
    const actualSelected = maskPng(
      cropPng(actual, 8, sidebarSelectedTop, 258, 30),
      selectedMasks,
    );
    const selectedComparison = comparePng(
      referenceSelected,
      actualSelected,
    );

    const footerMasks = [
      { height: 32, left: 8, top: 7, width: 218 },
    ];
    const referenceFooter = maskPng(
      cropPng(referenceFull, 0, 774, 274, 46),
      footerMasks,
    );
    const actualFooter = maskPng(
      cropPng(actual, 0, 774, 274, 46),
      footerMasks,
    );
    const footerComparison = comparePng(
      referenceFooter,
      actualFooter,
    );
    for (const [region, comparison] of [
      ["footer", footerComparison],
      ["selected", selectedComparison],
      ["top", topComparison],
    ]) {
      if (comparison.pixels > 0) {
        await writeFile(
          join(
            artifactDirectory,
            `${scene.id}.current-build.${region}.diff.png`,
          ),
          PNG.sync.write(comparison.diff),
        );
      }
    }
    const maximumTopRatio = environmentRatio(
      "CODEX_UI_KIT_SIDEBAR_TOP_MAX_DIFF_RATIO",
      0.045,
    );
    const maximumSelectedRatio = environmentRatio(
      "CODEX_UI_KIT_SIDEBAR_SELECTED_MAX_DIFF_RATIO",
      0.01,
    );
    const maximumFooterRatio = environmentRatio(
      "CODEX_UI_KIT_SIDEBAR_FOOTER_MAX_DIFF_RATIO",
      0.005,
    );
    if (
      topComparison.ratio > maximumTopRatio ||
      selectedComparison.ratio > maximumSelectedRatio ||
      footerComparison.ratio > maximumFooterRatio
    ) {
      throw new Error(
        `${scene.id}: current-build sidebar pixel ratios ${JSON.stringify({
          footer: footerComparison.ratio,
          selected: selectedComparison.ratio,
          top: topComparison.ratio,
        })} exceed ${JSON.stringify({
          footer: maximumFooterRatio,
          selected: maximumSelectedRatio,
          top: maximumTopRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build sidebar pixel ratios ${JSON.stringify({
        footer: footerComparison.ratio,
        selected: selectedComparison.ratio,
        top: topComparison.ratio,
      })}`,
    );
  }

  if (
    scene.id === "current-sidebar" &&
    currentBuildSidebarFooterControlsReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(currentBuildSidebarFooterControlsReference),
      ),
      { blue: 24, green: 24, red: 24 },
    );
    if (reference.width !== 133 || reference.height !== 46) {
      throw new Error(
        `${scene.id}: current footer controls reference must be exactly 133x46, received ${reference.width}x${reference.height}.`,
      );
    }
    const actualFooterControls = cropPng(actual, 141, 774, 133, 46);
    const comparison = comparePng(reference, actualFooterControls);
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.footer-controls.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_SIDEBAR_FOOTER_CONTROLS_MAX_DIFF_RATIO",
      0.035,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current footer controls pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current footer controls pixel ratio ${comparison.ratio}`,
    );
  }

  if (scene.id === "current-sidebar-status-lifecycle") {
    if (
      currentBuildSidebarTaskActionsReference &&
      sidebarTaskActionsActualPath
    ) {
      await compareCurrentBuildSidebarActions({
        actualPath: sidebarTaskActionsActualPath,
        defaultMaximumRatio: 0.06,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_SIDEBAR_TASK_ACTIONS_MAX_DIFF_RATIO",
        referencePath: currentBuildSidebarTaskActionsReference,
        sceneId: scene.id,
        variant: "task-actions",
      });
    }
    if (currentBuildSidebarActiveStatusReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.active,
        defaultMaximumRatio: 0.12,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_SIDEBAR_ACTIVE_STATUS_MAX_DIFF_RATIO",
        referencePath: currentBuildSidebarActiveStatusReference,
        sceneId: scene.id,
        status: "active",
      });
    }
    if (currentBuildSidebarWaitingStatusReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.waiting,
        defaultMaximumRatio: 0.04,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_SIDEBAR_WAITING_STATUS_MAX_DIFF_RATIO",
        referencePath: currentBuildSidebarWaitingStatusReference,
        sceneId: scene.id,
        status: "waiting",
      });
    }
    if (currentBuildSidebarUnreadStatusReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.unread,
        defaultMaximumRatio: 0.04,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_SIDEBAR_UNREAD_STATUS_MAX_DIFF_RATIO",
        referencePath: currentBuildSidebarUnreadStatusReference,
        sceneId: scene.id,
        status: "unread",
      });
    }
    if (currentBuildSidebarWorktreeLoadingReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.["worktree-loading"],
        defaultMaximumRatio: 0.06,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_LOADING_MAX_DIFF_RATIO",
        ownedWidth: 56,
        referencePath: currentBuildSidebarWorktreeLoadingReference,
        sceneId: scene.id,
        status: "worktree-loading",
      });
    }
    if (currentBuildSidebarWorktreeErrorReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.["worktree-error"],
        defaultMaximumRatio: 0.065,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_ERROR_MAX_DIFF_RATIO",
        ownedWidth: 84,
        referencePath: currentBuildSidebarWorktreeErrorReference,
        sceneId: scene.id,
        status: "worktree-error",
      });
    }
    if (currentBuildSidebarWorktreeRestoredReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.["worktree-restored"],
        defaultMaximumRatio: 0.025,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_SIDEBAR_WORKTREE_RESTORED_MAX_DIFF_RATIO",
        ownedWidth: 56,
        referencePath: currentBuildSidebarWorktreeRestoredReference,
        sceneId: scene.id,
        status: "worktree-restored",
      });
    }
  }

  if (scene.id === "current-sidebar-thread-lifecycle") {
    if (
      currentSidebar26825TaskActionsReference &&
      sidebarTaskActionsActualPath
    ) {
      await compareCurrentBuildSidebarActions({
        actualPath: sidebarTaskActionsActualPath,
        defaultMaximumRatio: 0.035,
        foregroundOnly: true,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_TASK_ACTIONS_MAX_DIFF_RATIO",
        ownedWidth: 56,
        referencePath: currentSidebar26825TaskActionsReference,
        sceneId: scene.id,
        variant: "task-actions",
      });
    }
    if (currentSidebar26825ActiveStatusReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.active,
        defaultMaximumRatio: 0.035,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_ACTIVE_STATUS_MAX_DIFF_RATIO",
        referencePath: currentSidebar26825ActiveStatusReference,
        sceneId: scene.id,
        status: "active",
      });
    }
    if (currentSidebar26825UnreadStatusReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.unread,
        defaultMaximumRatio: 0.02,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_UNREAD_STATUS_MAX_DIFF_RATIO",
        referencePath: currentSidebar26825UnreadStatusReference,
        sceneId: scene.id,
        status: "unread",
      });
    }
  }

  if (scene.id === "current-sidebar-worktree-lifecycle") {
    if (currentSidebar26825WorktreeActiveReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.active,
        defaultMaximumRatio: 0.065,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_WORKTREE_ACTIVE_MAX_DIFF_RATIO",
        ownedWidth: 84,
        referencePath: currentSidebar26825WorktreeActiveReference,
        sceneId: scene.id,
        status: "worktree-active",
      });
    }
    if (currentSidebar26825WorktreeFailedReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.failed,
        defaultMaximumRatio: 0.04,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_WORKTREE_FAILED_MAX_DIFF_RATIO",
        ownedWidth: 84,
        referencePath: currentSidebar26825WorktreeFailedReference,
        sceneId: scene.id,
        status: "worktree-failed",
      });
    }
    if (currentSidebar26825WorktreeRecoveredReference) {
      await compareCurrentBuildSidebarStatus({
        actual,
        actualBounds: sidebarStatusBounds?.recovered,
        defaultMaximumRatio: 0.025,
        maximumRatioName:
          "CODEX_UI_KIT_CURRENT_26_825_SIDEBAR_WORKTREE_RECOVERED_MAX_DIFF_RATIO",
        ownedWidth: 84,
        referencePath: currentSidebar26825WorktreeRecoveredReference,
        sceneId: scene.id,
        status: "worktree-recovered",
      });
    }
  }

  if (
    scene.id === "current-worktree-setup-failed" &&
    currentWorktreeSetupFailureReference
  ) {
    const referenceFull = flattenPng(
      PNG.sync.read(await readFile(currentWorktreeSetupFailureReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (referenceFull.width !== 1180 || referenceFull.height !== 820) {
      throw new Error(
        `${scene.id}: current worktree setup reference must be exactly 1180x820, received ${referenceFull.width}x${referenceFull.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current worktree setup comparison requires an 1180x820 frame.`,
      );
    }
    const reference = maskPng(
      foregroundMaskPng(cropPng(referenceFull, 383, 190, 736, 277)),
      [{ height: 106, left: 12, top: 171, width: 710 }],
    );
    const actualRegion = maskPng(
      foregroundMaskPng(cropPng(actual, 383, 190, 736, 277)),
      [{ height: 106, left: 12, top: 171, width: 710 }],
    );
    const comparison = comparePng(reference, actualRegion, 0);
    await writeFile(
      join(
        artifactDirectory,
        `${scene.id}.failure-card.current-build.png`,
      ),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.failure-card.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_26_825_WORKTREE_SETUP_FAILURE_MAX_DIFF_RATIO",
      0.065,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current worktree setup foreground pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current worktree setup foreground pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "current-sidebar-collection-empty" &&
    currentBuildSidebarEmptyCollectionReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(currentBuildSidebarEmptyCollectionReference),
      ),
      { blue: 24, green: 24, red: 24 },
    );
    if (reference.width !== 140 || reference.height !== 29) {
      throw new Error(
        `${scene.id}: current empty collection reference must be exactly 140x29, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      !sidebarCollectionBounds ||
      sidebarCollectionBounds.width < 140 ||
      sidebarCollectionBounds.height !== 29
    ) {
      throw new Error(
        `${scene.id}: current empty collection bounds drifted: ${JSON.stringify(sidebarCollectionBounds)}.`,
      );
    }
    const actualCollection = cropPng(
      actual,
      sidebarCollectionBounds.left,
      sidebarCollectionBounds.top,
      140,
      29,
    );
    const comparison = comparePng(
      foregroundMaskPng(reference),
      foregroundMaskPng(actualCollection),
      0,
    );
    await writeFile(
      join(
        artifactDirectory,
        `${scene.id}.empty.current-build.png`,
      ),
      PNG.sync.write(actualCollection),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.empty.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_SIDEBAR_EMPTY_COLLECTION_MAX_DIFF_RATIO",
      0.06,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current empty collection pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current empty collection pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "current-sidebar-collection-long-list" &&
    currentBuildSidebarShowMoreReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildSidebarShowMoreReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (reference.width !== 140 || reference.height !== 32) {
      throw new Error(
        `${scene.id}: current Show more reference must be exactly 140x32, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      !sidebarShowMoreBounds ||
      sidebarShowMoreBounds.width < 140 ||
      sidebarShowMoreBounds.height !== 32
    ) {
      throw new Error(
        `${scene.id}: current Show more bounds drifted: ${JSON.stringify(sidebarShowMoreBounds)}.`,
      );
    }
    const actualShowMore = cropPng(
      actual,
      sidebarShowMoreBounds.left,
      sidebarShowMoreBounds.top,
      140,
      32,
    );
    const comparison = comparePng(
      foregroundMaskPng(reference),
      foregroundMaskPng(actualShowMore),
      0,
    );
    await writeFile(
      join(
        artifactDirectory,
        `${scene.id}.show-more.current-build.png`,
      ),
      PNG.sync.write(actualShowMore),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.show-more.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_SIDEBAR_SHOW_MORE_MAX_DIFF_RATIO",
      0.05,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current Show more pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current Show more pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "current-sidebar-recents" &&
    currentBuildSidebarRecentsActionsReference &&
    sidebarRecentsActionsActualPath
  ) {
    await compareCurrentBuildSidebarActions({
      actualPath: sidebarRecentsActionsActualPath,
      defaultMaximumRatio: 0.06,
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_SIDEBAR_RECENTS_ACTIONS_MAX_DIFF_RATIO",
      referencePath: currentBuildSidebarRecentsActionsReference,
      sceneId: scene.id,
      variant: "recents-actions",
    });
  }

  if (
    scene.id === "current-sidebar-recents" &&
    currentBuildSidebarRecentsReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: sidebarRecentsBounds,
      defaultMaximumRatio: 0.08,
      masks: [
        { height: 26, left: 8, top: 0, width: 220 },
        { height: 26, left: 8, top: 27, width: 220 },
        { height: 26, left: 8, top: 58, width: 220 },
        { height: 26, left: 8, top: 89, width: 220 },
        { height: 26, left: 8, top: 120, width: 220 },
        { height: 26, left: 8, top: 151, width: 220 },
        { height: 26, left: 8, top: 182, width: 220 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_SIDEBAR_RECENTS_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 210,
        left: 0,
        top: 556,
        width: 274,
      },
      referencePath: currentBuildSidebarRecentsReference,
      sceneId: scene.id,
    });
  }

  if (
    (scene.id === "current-sidebar-project-menu" ||
      scene.id === "current-sidebar-project-section-submenu") &&
    currentBuildSidebarProjectMenuReference
  ) {
    if (sidebarMenuItemBounds?.length !== 6) {
      throw new Error(
        `${scene.id}: expected six project menu item bounds, received ${sidebarMenuItemBounds?.length ?? 0}.`,
      );
    }
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: sidebarMenuBounds,
      // AppKit/CoreText and Chromium rasterize the same unmasked fixed labels
      // and SVG paths differently. The exact structure and source hashes are
      // gated independently; 5% keeps the full native-region comparison tight.
      defaultMaximumRatio: 0.05,
      expectedActualPosition: { left: 211, top: 313 },
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_MENU_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 187,
        left: 0,
        top: 0,
        width: 252,
      },
      referencePath: currentBuildSidebarProjectMenuReference,
      referenceSize: { height: 187, width: 252 },
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "current-sidebar-project-section-submenu" &&
    currentBuildSidebarProjectSubmenuReference
  ) {
    if (
      sidebarProjectSubmenuItemBounds?.length !== 1 ||
      JSON.stringify(sidebarProjectSubmenuItemBounds[0]) !==
        JSON.stringify({ height: 24, left: 5, top: 5, width: 108 })
    ) {
      throw new Error(
        `${scene.id}: unexpected Section submenu item geometry ${JSON.stringify(sidebarProjectSubmenuItemBounds)}.`,
      );
    }
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: sidebarProjectSubmenuBounds,
      // The 118x34 AppKit/CoreText region is text-dominant. Exact geometry,
      // sampled colors, focus, and source assets are gated separately; 7%
      // preserves the reviewed cross-renderer raster boundary.
      defaultMaximumRatio: 0.07,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_SUBMENU_MAX_DIFF_RATIO",
      referenceCrop: { height: 34, left: 0, top: 0, width: 118 },
      referencePath: currentBuildSidebarProjectSubmenuReference,
      referenceSize: { height: 34, width: 118 },
      sceneId: `${scene.id}-submenu`,
    });
  }

  if (
    scene.id === "current-sidebar-help-menu" &&
    currentBuildSidebarHelpMenuReference
  ) {
    if (sidebarMenuItemBounds?.length !== 8) {
      throw new Error(
        `${scene.id}: expected eight Help menu item bounds, received ${sidebarMenuItemBounds?.length ?? 0}.`,
      );
    }
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: sidebarMenuBounds,
      defaultMaximumRatio: 0.005,
      expectedActualPosition: { left: 235, top: 502 },
      masks: [
        { height: 19, left: 8, top: 4, width: 110 },
        ...sidebarMenuItemBounds.map(({ height, top, width }) => ({
          height: Math.max(0, height - 8),
          left: 34,
          top: top + 4,
          width: Math.max(0, width - 38),
        })),
      ],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_SIDEBAR_HELP_MENU_MAX_DIFF_RATIO",
      referenceCrop: {
        height: 272,
        left: 235,
        top: 502,
        width: 200,
      },
      referencePath: currentBuildSidebarHelpMenuReference,
      sceneId: scene.id,
    });
  }

  const currentBuildAccountMenuReference = {
    "current-sidebar-account-menu": currentBuildSidebarAccountMenuReference,
    "current-sidebar-account-menu-compact":
      currentBuildSidebarAccountMenuCompactReference,
    "current-sidebar-account-menu-light":
      currentBuildSidebarAccountMenuLightReference,
    "current-sidebar-account-menu-light-compact":
      currentBuildSidebarAccountMenuLightCompactReference,
  }[scene.id];
  if (currentBuildAccountMenuReference) {
    if (sidebarMenuItemBounds?.length !== 6) {
      throw new Error(
        `${scene.id}: expected six account menu item bounds, received ${sidebarMenuItemBounds?.length ?? 0}.`,
      );
    }
    const compact = scene.id.endsWith("compact");
    const expectedTop = compact ? 447 : 587;
    const maximumRatioName = {
      "current-sidebar-account-menu":
        "CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_MAX_DIFF_RATIO",
      "current-sidebar-account-menu-compact":
        "CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_COMPACT_MAX_DIFF_RATIO",
      "current-sidebar-account-menu-light":
        "CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_LIGHT_MAX_DIFF_RATIO",
      "current-sidebar-account-menu-light-compact":
        "CODEX_UI_KIT_CURRENT_SIDEBAR_ACCOUNT_MENU_LIGHT_COMPACT_MAX_DIFF_RATIO",
    }[scene.id];
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: sidebarMenuBounds,
      // Native translucent-menu compositing shifts subpixel icon and border
      // edges between the product and harness while preserving exact source
      // paths, bounds, radii, and typography. Keep the owned-region gate
      // below one percent for every light/dark and wide/compact variant.
      defaultMaximumRatio: 0.008,
      expectedActualPosition: { left: 9, top: expectedTop },
      masks: [
        {
          height: Math.max(0, sidebarMenuItemBounds[0].height - 8),
          left: 10,
          top: sidebarMenuItemBounds[0].top + 4,
          width: 278,
        },
        {
          height: Math.max(0, sidebarMenuItemBounds[1].height - 8),
          left: 34,
          top: sidebarMenuItemBounds[1].top + 4,
          width: 238,
        },
        ...sidebarMenuItemBounds.slice(2, 4).map(({ height, top }) => ({
          height: Math.max(0, height - 8),
          left: 34,
          top: top + 4,
          width: 250,
        })),
        {
          height: Math.max(0, sidebarMenuItemBounds[4].height - 8),
          left: 34,
          top: sidebarMenuItemBounds[4].top + 4,
          width: 205,
        },
        {
          height: Math.max(0, sidebarMenuItemBounds[5].height - 8),
          left: 34,
          top: sidebarMenuItemBounds[5].top + 4,
          width: 250,
        },
      ],
      maximumRatioName,
      referenceCrop: {
        height: 188,
        left: 9,
        top: expectedTop,
        width: 306,
      },
      referencePath: currentBuildAccountMenuReference,
      referenceSize: compact
        ? { height: 680, width: 720 }
        : currentBuildWorkspaceReferenceSize,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "current-sidebar-project-collapsed" &&
    currentBuildSidebarProjectCollapsedReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: { height: 135, left: 0, top: 250, width: 274 },
      defaultMaximumRatio: 0.02,
      masks: [
        { height: 24, left: 16, top: 2, width: 90 },
        { height: 105, left: 38, top: 30, width: 172 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_SIDEBAR_PROJECT_COLLAPSED_MAX_DIFF_RATIO",
      referenceCrop: { height: 135, left: 0, top: 250, width: 274 },
      referencePath: currentBuildSidebarProjectCollapsedReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "current-sidebar-compact-pinned" &&
    currentBuildSidebarCompactPinnedReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: { height: 680, left: 0, top: 0, width: 274 },
      defaultMaximumRatio: 0.035,
      masks: [
        { height: 32, left: 16, top: 45, width: 82 },
        { height: 154, left: 38, top: 83, width: 180 },
        { height: 28, left: 16, top: 253, width: 90 },
        { height: 351, left: 38, top: 282, width: 172 },
        { height: 42, left: 39, top: 638, width: 181 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_SIDEBAR_COMPACT_PINNED_MAX_DIFF_RATIO",
      referenceCrop: { height: 680, left: 0, top: 0, width: 274 },
      referencePath: currentBuildSidebarCompactPinnedReference,
      referenceSize: { height: 680, width: 720 },
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "shell-loading" &&
    currentBuildWindowChromeReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildWindowChromeReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildWindowChromeReferenceSize.width ||
      reference.height !== currentBuildWindowChromeReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build window chrome reference must be exactly ${currentBuildWindowChromeReferenceSize.width}x${currentBuildWindowChromeReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    const actualChrome = cropPng(actual, 80, 0, 120, 46);
    const comparison = comparePng(reference, actualChrome);
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_WINDOW_CHROME_MAX_DIFF_RATIO",
      0.05,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build window chrome pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build window chrome pixel ratio ${comparison.ratio}`,
    );
  }

  const currentBuildComposerReference =
    scene.id === "composer-queued"
      ? currentBuildComposerQueuedReference
      : scene.id === "composer-auto-continued"
        ? currentBuildComposerContinuedReference
      : scene.id === "composer-queue-paused"
        ? currentBuildComposerPausedReference
        : undefined;
  if (currentBuildComposerReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildComposerReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildComposerReferenceSize.width ||
      reference.height !== currentBuildComposerReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build Composer reference must be exactly ${currentBuildComposerReferenceSize.width}x${currentBuildComposerReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current-build Composer comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const actualRegion = cropPng(actual, 331, 500, 792, 320);
    const masks =
      scene.id === "composer-auto-continued"
        ? [
            { height: 65, left: 0, top: 0, width: 792 },
            { height: 35, left: 46, top: 65, width: 200 },
            { height: 90, left: 0, top: 115, width: 792 },
            { height: 45, left: 65, top: 255, width: 220 },
            { height: 40, left: 530, top: 255, width: 155 },
          ]
        : [
            {
              height: scene.id === "composer-queued" ? 150 : 130,
              left: 0,
              top: 0,
              width: 792,
            },
            { height: 42, left: 45, top: 166, width: 505 },
            { height: 45, left: 65, top: 255, width: 220 },
            { height: 40, left: 530, top: 255, width: 155 },
            ...(scene.id === "composer-queue-paused"
              ? [{ height: 34, left: 45, top: 136, width: 590 }]
              : []),
          ];
    const maskedReference = maskPng(reference, masks);
    const maskedActual = maskPng(
      cropPng(actual, 331, 500, 792, 320),
      masks,
    );
    const comparison = comparePng(maskedReference, maskedActual);
    const maximumRatio = environmentRatio(
      scene.id === "composer-queued"
        ? "CODEX_UI_KIT_COMPOSER_QUEUED_MAX_DIFF_RATIO"
        : scene.id === "composer-auto-continued"
          ? "CODEX_UI_KIT_COMPOSER_CONTINUED_MAX_DIFF_RATIO"
        : "CODEX_UI_KIT_COMPOSER_PAUSED_MAX_DIFF_RATIO",
      scene.id === "composer-queue-paused" ? 0.08 : 0.02,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build Composer pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build Composer pixel ratio ${comparison.ratio}`,
    );
  }

  const currentBuildComposerLifecycleReference =
    scene.id === "composer-multiline"
      ? currentBuildComposerMultilineReference
      : scene.id === "composer-permissions-menu"
        ? currentBuildComposerPermissionsReference
        : scene.id === "composer-resources-menu"
          ? currentBuildComposerResourcesReference
          : scene.id === "composer-goal"
            ? currentBuildComposerGoalReference
            : scene.id === "composer-plan"
              ? currentBuildComposerPlanReference
          : undefined;
  if (currentBuildComposerLifecycleReference) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(currentBuildComposerLifecycleReference),
      ),
      { blue: 24, green: 24, red: 24 },
    );
    const isMultiline = scene.id === "composer-multiline";
    const expectedSize = isMultiline
      ? currentBuildComposerReferenceSize
      : currentBuildComposerMenuReferenceSize;
    if (
      reference.width !== expectedSize.width ||
      reference.height !== expectedSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build Composer lifecycle reference must be exactly ${expectedSize.width}x${expectedSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current-build Composer lifecycle comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const actualRegion = isMultiline
      ? cropPng(actual, 331, 500, 792, 320)
      : cropPng(actual, 274, 0, 906, 820);
    const masks = isMultiline
      ? [
          { height: 165, left: 0, top: 0, width: 792 },
          { height: 88, left: 38, top: 177, width: 570 },
          { height: 40, left: 38, top: 270, width: 610 },
        ]
      : scene.id === "composer-permissions-menu"
        ? [
            { height: 535, left: 0, top: 0, width: 906 },
            { height: 240, left: 0, top: 535, width: 120 },
            { height: 240, left: 615, top: 535, width: 291 },
            { height: 210, left: 140, top: 550, width: 455 },
            { height: 45, left: 0, top: 775, width: 80 },
            { height: 45, left: 825, top: 775, width: 81 },
            { height: 90, left: 95, top: 675, width: 600 },
            { height: 45, left: 95, top: 765, width: 710 },
          ]
        : scene.id === "composer-resources-menu"
          ? [
            { height: 335, left: 0, top: 0, width: 906 },
            { height: 335, left: 0, top: 335, width: 80 },
            { height: 335, left: 825, top: 335, width: 81 },
            { height: 300, left: 100, top: 360, width: 710 },
            { height: 45, left: 0, top: 775, width: 80 },
            { height: 45, left: 825, top: 775, width: 81 },
            { height: 90, left: 95, top: 675, width: 600 },
            { height: 45, left: 95, top: 765, width: 710 },
            ]
          : [
              { height: 665, left: 0, top: 0, width: 906 },
              { height: 155, left: 0, top: 665, width: 75 },
              { height: 155, left: 835, top: 665, width: 71 },
              { height: 55, left: 600, top: 765, width: 235 },
            ];
    const maskedReference = maskPng(clonePng(reference), masks);
    const maskedActual = maskPng(clonePng(actualRegion), masks);
    const comparison = comparePng(maskedReference, maskedActual);
    const maximumRatio = environmentRatio(
      scene.id === "composer-multiline"
        ? "CODEX_UI_KIT_COMPOSER_MULTILINE_MAX_DIFF_RATIO"
        : scene.id === "composer-permissions-menu"
          ? "CODEX_UI_KIT_COMPOSER_PERMISSIONS_MAX_DIFF_RATIO"
          : scene.id === "composer-resources-menu"
            ? "CODEX_UI_KIT_COMPOSER_RESOURCES_MAX_DIFF_RATIO"
            : scene.id === "composer-goal"
              ? "CODEX_UI_KIT_COMPOSER_GOAL_MAX_DIFF_RATIO"
              : "CODEX_UI_KIT_COMPOSER_PLAN_MAX_DIFF_RATIO",
      scene.id === "composer-resources-menu" ? 0.008 : 0.005,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build Composer lifecycle pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build Composer lifecycle pixel ratio ${comparison.ratio}`,
    );
  }

  const currentComposer26820ModeReference =
    scene.id === "composer-goal"
      ? currentComposer26820GoalReference
      : scene.id === "composer-goal-compact"
        ? currentComposer26820GoalCompactReference
        : scene.id === "composer-plan"
          ? currentComposer26820PlanReference
          : scene.id === "composer-plan-compact"
            ? currentComposer26820PlanCompactReference
            : undefined;
  if (currentComposer26820ModeReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentComposer26820ModeReference)),
      { blue: 24, green: 24, red: 24 },
    );
    const compact = scene.id.endsWith("-compact");
    const goal = scene.frame === "composer-goal";
    const expectedSize = {
      height: goal ? 134 : 98,
      width: compact ? 688 : 736,
    };
    if (
      reference.width !== expectedSize.width ||
      reference.height !== expectedSize.height
    ) {
      throw new Error(
        `${scene.id}: current 26.820 Composer mode reference must be exactly ${expectedSize.width}x${expectedSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    const bounds = currentComposer26820ModeBounds;
    if (
      !bounds ||
      bounds.width !== expectedSize.width ||
      bounds.height !== expectedSize.height
    ) {
      throw new Error(
        `${scene.id}: current 26.820 Composer mode bounds drifted: ${JSON.stringify(bounds)}.`,
      );
    }
    const actualRegion = cropPng(
      actual,
      bounds.left,
      bounds.top,
      bounds.width,
      bounds.height,
    );
    const comparison = comparePng(reference, actualRegion);
    const maximumRatio = environmentRatio(
      goal
        ? compact
          ? "CODEX_UI_KIT_CURRENT_COMPOSER_26_820_GOAL_COMPACT_MAX_DIFF_RATIO"
          : "CODEX_UI_KIT_CURRENT_COMPOSER_26_820_GOAL_MAX_DIFF_RATIO"
        : compact
          ? "CODEX_UI_KIT_CURRENT_COMPOSER_26_820_PLAN_COMPACT_MAX_DIFF_RATIO"
          : "CODEX_UI_KIT_CURRENT_COMPOSER_26_820_PLAN_MAX_DIFF_RATIO",
      goal ? 0.045 : 0.04,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-26-820.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-26-820.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.820 Composer mode pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.820 Composer mode pixel ratio ${comparison.ratio}`,
    );
  }

  if (scene.id === "thread-windowed" && currentBuildLongThreadReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildLongThreadReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildLongThreadReferenceSize.width ||
      reference.height !== currentBuildLongThreadReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build long-thread reference must be exactly ${currentBuildLongThreadReferenceSize.width}x${currentBuildLongThreadReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current-build long-thread comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const actualRegion = cropPng(actual, 274, 0, 906, 820);
    const masks = [
      { height: 140, left: 0, top: 0, width: 906 },
      { height: 430, left: 60, top: 140, width: 846 },
      { height: 100, left: 60, top: 570, width: 360 },
      { height: 100, left: 490, top: 570, width: 416 },
      { height: 60, left: 60, top: 670, width: 846 },
      { height: 90, left: 0, top: 730, width: 906 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actualRegion), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_LONG_THREAD_MAX_DIFF_RATIO",
      0.01,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build long-thread pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build long-thread pixel ratio ${comparison.ratio}`,
    );
  }

  const current26820LongThreadReference =
    scene.id === "thread-current-26-820-middle"
      ? current26820LongThreadWideReference
      : scene.id === "thread-current-26-820-compact-away"
        ? current26820LongThreadCompactReference
        : undefined;
  if (current26820LongThreadReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(current26820LongThreadReference)),
      { blue: 24, green: 24, red: 24 },
    );
    const expectedSize =
      scene.id === "thread-current-26-820-middle"
        ? { height: 820, width: 1180 }
        : { height: 680, width: 720 };
    if (
      reference.width !== expectedSize.width ||
      reference.height !== expectedSize.height ||
      actual.width !== expectedSize.width ||
      actual.height !== expectedSize.height
    ) {
      throw new Error(
        `${scene.id}: current 26.820 reference and playground must both be exactly ${expectedSize.width}x${expectedSize.height}.`,
      );
    }
    const masks =
      scene.id === "thread-current-26-820-middle"
        ? [
            { height: 592, left: 54, top: 48, width: 1106 },
            { height: 592, left: 1160, top: 48, width: 20 },
          ]
        : [
            { height: 510, left: 0, top: 48, width: 336 },
            { height: 510, left: 384, top: 48, width: 336 },
            { height: 454, left: 336, top: 48, width: 48 },
            { height: 8, left: 336, top: 550, width: 48 },
          ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(flattenPng(actual, {
        blue: 24,
        green: 24,
        red: 24,
      })), masks),
    );
    const maximumRatio = environmentRatio(
      scene.id === "thread-current-26-820-middle"
        ? "CODEX_UI_KIT_CURRENT_26_820_LONG_THREAD_WIDE_MAX_DIFF_RATIO"
        : "CODEX_UI_KIT_CURRENT_26_820_LONG_THREAD_COMPACT_MAX_DIFF_RATIO",
      0.02,
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-26-820.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.820 structural pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.820 structural pixel ratio ${comparison.ratio}`,
    );
  }

  const currentBuildApprovalReference =
    scene.id === "approval-current-pending" ||
    scene.id === "approval-current-allow-once-pending"
      ? currentBuildApprovalPendingReference
      : scene.id === "approval-current-similar-menu"
        ? currentBuildApprovalSimilarMenuReference
      : scene.id === "approval-current-denied"
        ? currentBuildApprovalDeniedReference
        : scene.id === "approval-current-allow-once-completed"
          ? currentBuildApprovalAllowOnceCompletedReference
          : scene.id ===
              "approval-current-similar-repeated-completed"
            ? currentBuildApprovalSimilarCompletedReference
        : undefined;
  const currentBuildAttachmentReference =
    scene.id === "attachment-current-ready"
      ? currentBuildAttachmentReadyReference
      : scene.id === "attachment-current-completed"
        ? currentBuildAttachmentCompletedReference
        : undefined;
  if (currentBuildAttachmentReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildAttachmentReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildAttachmentReferenceSize.width ||
      reference.height !== currentBuildAttachmentReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build attachment reference must be exactly ${currentBuildAttachmentReferenceSize.width}x${currentBuildAttachmentReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current-build attachment comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const actualRegion = cropPng(actual, 274, 0, 906, 820);
    const masks =
      scene.id === "attachment-current-ready"
        ? [
            { height: 624, left: 0, top: 0, width: 906 },
            { height: 180, left: 0, top: 624, width: 85 },
            { height: 180, left: 821, top: 624, width: 85 },
            { height: 16, left: 0, top: 804, width: 906 },
          ]
        : [
            { height: 70, left: 0, top: 0, width: 906 },
            { height: 250, left: 0, top: 70, width: 85 },
            { height: 250, left: 821, top: 70, width: 85 },
            { height: 386, left: 0, top: 320, width: 906 },
            { height: 98, left: 0, top: 706, width: 85 },
            { height: 98, left: 821, top: 706, width: 85 },
            { height: 16, left: 0, top: 804, width: 906 },
          ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actualRegion), masks),
    );
    const maximumRatio = environmentRatio(
      scene.id === "attachment-current-ready"
        ? "CODEX_UI_KIT_ATTACHMENT_READY_MAX_DIFF_RATIO"
        : "CODEX_UI_KIT_ATTACHMENT_COMPLETED_MAX_DIFF_RATIO",
      0.015,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build attachment pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build attachment pixel ratio ${comparison.ratio}`,
    );
  }
  if (
    scene.id === "attachment-current-post-picker-compact" &&
    currentAttachmentPickerReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentAttachmentPickerReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== 720 ||
      reference.height !== 680 ||
      actual.width !== 720 ||
      actual.height !== 680
    ) {
      throw new Error(
        `${scene.id}: current attachment picker comparison requires exact 720x680 reference and playground frames.`,
      );
    }
    const referenceComposer = cropPng(reference, 43, 347, 640, 178);
    const actualComposer = cropPng(
      flattenPng(clonePng(actual), { blue: 24, green: 24, red: 24 }),
      39,
      486,
      640,
      178,
    );
    const comparison = comparePng(referenceComposer, actualComposer, 0.1);
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_ATTACHMENT_PICKER_MAX_DIFF_RATIO",
      0.02,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-product.png`),
      PNG.sync.write(actualComposer),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-product.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current attachment picker product pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current attachment picker product pixel ratio ${comparison.ratio}`,
    );
  }
  if (
    scene.id === "attachment-current-preview-compact" &&
    currentAttachmentPreviewReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentAttachmentPreviewReference)),
      { blue: 0, green: 0, red: 0 },
    );
    if (
      reference.width !== 720 ||
      reference.height !== 680 ||
      actual.width !== 720 ||
      actual.height !== 680
    ) {
      throw new Error(
        `${scene.id}: current attachment preview comparison requires exact 720x680 reference and playground frames.`,
      );
    }
    const flattenedActual = flattenPng(clonePng(actual), {
      blue: 0,
      green: 0,
      red: 0,
    });
    const compareRegion = ({ height, left, top, width }) =>
      comparePng(
        cropPng(reference, left, top, width, height),
        cropPng(flattenedActual, left, top, width, height),
        0.1,
      );
    const actionsComparison = compareRegion({
      height: 40,
      left: 618,
      top: 12,
      width: 90,
    });
    const imageComparison = compareRegion({
      height: 456,
      left: 32,
      top: 88,
      width: 656,
    });
    const toolbarComparison = compareRegion({
      height: 44,
      left: 284,
      top: 604,
      width: 152,
    });
    const maximumActionsRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_ATTACHMENT_PREVIEW_ACTIONS_MAX_DIFF_RATIO",
      0.001,
    );
    const maximumImageRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_ATTACHMENT_PREVIEW_IMAGE_MAX_DIFF_RATIO",
      0.005,
    );
    const maximumToolbarRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_ATTACHMENT_PREVIEW_TOOLBAR_MAX_DIFF_RATIO",
      0.025,
    );
    if (
      actionsComparison.ratio > maximumActionsRatio ||
      imageComparison.ratio > maximumImageRatio ||
      toolbarComparison.ratio > maximumToolbarRatio
    ) {
      throw new Error(
        `${scene.id}: current attachment preview product pixel ratios exceed limits: ${JSON.stringify({ actions: actionsComparison.ratio, image: imageComparison.ratio, toolbar: toolbarComparison.ratio })}.`,
      );
    }
    console.log(
      `${scene.id}: current attachment preview product pixel ratios ${JSON.stringify({ actions: actionsComparison.ratio, image: imageComparison.ratio, toolbar: toolbarComparison.ratio })}`,
    );
  }
  if (currentBuildApprovalReference) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildApprovalReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildApprovalReferenceSize.width ||
      reference.height !== currentBuildApprovalReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build approval reference must be exactly ${currentBuildApprovalReferenceSize.width}x${currentBuildApprovalReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (actual.width !== 1180 || actual.height !== 820) {
      throw new Error(
        `${scene.id}: current-build approval comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const actualRegion = cropPng(actual, 274, 0, 906, 820);
    const masks =
      scene.id === "approval-current-pending" ||
      scene.id === "approval-current-allow-once-pending"
        ? [
            { height: 55, left: 0, top: 0, width: 906 },
            { height: 48, left: 264, top: 70, width: 548 },
            { height: 25, left: 80, top: 168, width: 135 },
            { height: 26, left: 104, top: 215, width: 260 },
            { height: 29, left: 94, top: 682, width: 700 },
            { height: 750, left: 890, top: 55, width: 16 },
          ]
        : scene.id === "approval-current-similar-menu"
          ? [
              { height: 55, left: 0, top: 0, width: 906 },
              { height: 68, left: 264, top: 55, width: 548 },
              { height: 25, left: 80, top: 168, width: 220 },
              { height: 26, left: 104, top: 215, width: 300 },
              { height: 72, left: 95, top: 680, width: 480 },
              { height: 750, left: 890, top: 55, width: 16 },
            ]
        : [
            { height: 55, left: 0, top: 0, width: 906 },
            { height: 26, left: 80, top: 139, width: 550 },
            { height: 120, left: 500, top: 470, width: 260 },
            { height: 82, left: 95, top: 714, width: 710 },
            { height: 750, left: 890, top: 55, width: 16 },
          ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actualRegion), masks),
    );
    const maximumRatio = environmentRatio(
      scene.id === "approval-current-pending" ||
      scene.id === "approval-current-allow-once-pending"
        ? "CODEX_UI_KIT_APPROVAL_PENDING_MAX_DIFF_RATIO"
        : scene.id === "approval-current-similar-menu"
          ? "CODEX_UI_KIT_APPROVAL_SIMILAR_MENU_MAX_DIFF_RATIO"
        : scene.id === "approval-current-allow-once-completed"
          ? "CODEX_UI_KIT_APPROVAL_ALLOW_ONCE_COMPLETED_MAX_DIFF_RATIO"
          : scene.id ===
              "approval-current-similar-repeated-completed"
            ? "CODEX_UI_KIT_APPROVAL_SIMILAR_COMPLETED_MAX_DIFF_RATIO"
          : "CODEX_UI_KIT_APPROVAL_DENIED_MAX_DIFF_RATIO",
      0.015,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualRegion),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build approval pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build approval pixel ratio ${comparison.ratio}`,
    );
  }
  if (
    scene.id === "approval-current-pending" &&
    currentApprovalPendingRegionReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: currentApprovalBounds,
      defaultMaximumRatio: 0.04,
      expectedActualPosition: { left: 359, top: 642 },
      masks: [
        { height: 20, left: 38, top: 14, width: 70 },
        { height: 22, left: 12, top: 45, width: 420 },
        { height: 18, left: 20, top: 85, width: 696 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_APPROVAL_PENDING_REGION_MAX_DIFF_RATIO",
      referenceCrop: { height: 162, left: 0, top: 0, width: 736 },
      referencePath: currentApprovalPendingRegionReference,
      referenceSize: currentApprovalPendingRegionReferenceSize,
      sceneId: `${scene.id}.region`,
    });
  }
  if (
    scene.id === "approval-current-options" &&
    currentApprovalOptionsRegionReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: currentApprovalOptionsBounds,
      defaultMaximumRatio: 0.05,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_APPROVAL_OPTIONS_REGION_MAX_DIFF_RATIO",
      referenceCrop: { height: 67, left: 0, top: 0, width: 193 },
      referencePath: currentApprovalOptionsRegionReference,
      referenceSize: currentApprovalOptionsRegionReferenceSize,
      sceneId: `${scene.id}.region`,
    });
  }
  if (
    scene.id === "approval-current-denied" &&
    currentApprovalDeniedComposerRegionReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: currentApprovalComposerBounds,
      defaultMaximumRatio: 0.035,
      expectedActualPosition: { left: 359, top: 706 },
      masks: [
        { height: 20, left: 10, top: 15, width: 140 },
        { height: 35, left: 515, top: 27, width: 153 },
        { height: 24, left: 60, top: 63, width: 135 },
        { height: 24, left: 526, top: 63, width: 145 },
      ],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_APPROVAL_DENIED_COMPOSER_REGION_MAX_DIFF_RATIO",
      referenceCrop: { height: 98, left: 0, top: 0, width: 736 },
      referencePath: currentApprovalDeniedComposerRegionReference,
      referenceSize: currentApprovalDeniedComposerRegionReferenceSize,
      sceneId: `${scene.id}.region`,
    });
  }
  const currentApproval26820Reference =
    scene.id === "approval-current-26-820-file-deny-pending"
      ? currentApproval26820PendingWideReference
      : scene.id === "approval-current-26-820-file-deny-pending-compact"
        ? currentApproval26820PendingCompactReference
        : undefined;
  if (currentApproval26820Reference) {
    const compact = scene.id.endsWith("compact");
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: currentApproval26820Bounds,
      defaultMaximumRatio: compact ? 0.063 : 0.062,
      expectedActualPosition: compact
        ? { left: 16, top: 515 }
        : { left: 222, top: 655 },
      masks: [],
      maximumRatioName: compact
        ? "CODEX_UI_KIT_CURRENT_APPROVAL_26_820_PENDING_COMPACT_MAX_DIFF_RATIO"
        : "CODEX_UI_KIT_CURRENT_APPROVAL_26_820_PENDING_WIDE_MAX_DIFF_RATIO",
      referenceCrop: compact
        ? { height: 150, left: 16, top: 515, width: 688 }
        : { height: 150, left: 222, top: 655, width: 736 },
      referencePath: currentApproval26820Reference,
      referenceSize: compact
        ? { height: 680, width: 720 }
        : { height: 820, width: 1180 },
      sceneId: `${scene.id}.current-product`,
    });
  }
  if (
    scene.id === "approval-current-26-820-file-options-compact" &&
    currentApproval26820OptionsCompactReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: currentApproval26820OptionsBounds,
      defaultMaximumRatio: 0.055,
      expectedActualPosition: { left: 519, top: 551 },
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_CURRENT_APPROVAL_26_820_OPTIONS_COMPACT_MAX_DIFF_RATIO",
      referenceCrop: { height: 67, left: 519, top: 551, width: 168 },
      referencePath: currentApproval26820OptionsCompactReference,
      referenceSize: { height: 680, width: 720 },
      sceneId: `${scene.id}.current-product`,
    });
  }

  if (
    scene.id === "command-output-expanded" &&
    currentBuildCommandOutputReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildCommandOutputReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildCommandOutputReferenceSize.width ||
      reference.height !== currentBuildCommandOutputReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-output reference must be exactly ${currentBuildCommandOutputReferenceSize.width}x${currentBuildCommandOutputReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.width !== currentBuildCommandOutputReferenceSize.width ||
      actual.height !== currentBuildCommandOutputReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-output comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const masks = [
      { height: 820, left: 0, top: 0, width: 274 },
      { height: 47, left: 274, top: 0, width: 906 },
      { height: 54, left: 274, top: 47, width: 906 },
      { height: 21, left: 282, top: 105, width: 42 },
      { height: 22, left: 282, top: 134, width: 104 },
      { height: 145, left: 282, top: 156, width: 58 },
      { height: 55, left: 967, top: 132, width: 38 },
      { height: 24, left: 922, top: 300, width: 82 },
      { height: 90, left: 274, top: 328, width: 736 },
      { height: 650, left: 1080, top: 47, width: 22 },
      { height: 75, left: 284, top: 716, width: 714 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actual), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_COMMAND_OUTPUT_MAX_DIFF_RATIO",
      0.015,
    );
    await writeFile(
      join(
        artifactDirectory,
        `${scene.id}.current-build.png`,
      ),
      PNG.sync.write(actual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build command-output pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build command-output pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "command-failure-expanded" &&
    currentBuildCommandFailureReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildCommandFailureReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildCommandFailureReferenceSize.width ||
      reference.height !== currentBuildCommandFailureReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-failure reference must be exactly ${currentBuildCommandFailureReferenceSize.width}x${currentBuildCommandFailureReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.width !== currentBuildCommandFailureReferenceSize.width ||
      actual.height !== currentBuildCommandFailureReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-failure comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const masks = [
      { height: 820, left: 0, top: 0, width: 274 },
      { height: 47, left: 274, top: 0, width: 906 },
      { height: 24, left: 274, top: 398, width: 736 },
      { height: 42, left: 274, top: 428, width: 736 },
      { height: 48, left: 474, top: 449, width: 536 },
      { height: 70, left: 274, top: 539, width: 736 },
      { height: 650, left: 1080, top: 47, width: 22 },
      { height: 75, left: 284, top: 716, width: 714 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actual), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_COMMAND_FAILURE_MAX_DIFF_RATIO",
      0.01,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build command-failure pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build command-failure pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "command-interruption-stopping" &&
    currentBuildCommandInterruptionReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(currentBuildCommandInterruptionReference),
      ),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildCommandInterruptionReferenceSize.width ||
      reference.height !== currentBuildCommandInterruptionReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-interruption reference must be exactly ${currentBuildCommandInterruptionReferenceSize.width}x${currentBuildCommandInterruptionReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.width !== currentBuildCommandInterruptionReferenceSize.width ||
      actual.height !== currentBuildCommandInterruptionReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build command-interruption comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const masks = [
      { height: 820, left: 0, top: 0, width: 274 },
      { height: 47, left: 274, top: 0, width: 906 },
      { height: 26, left: 350, top: 47, width: 210 },
      { height: 30, left: 375, top: 87, width: 670 },
      { height: 40, left: 1010, top: 47, width: 80 },
      { height: 650, left: 1080, top: 47, width: 22 },
      { height: 80, left: 368, top: 714, width: 680 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actual), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_COMMAND_INTERRUPTION_MAX_DIFF_RATIO",
      0.005,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build command-interruption pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build command-interruption pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "context-compaction-running" &&
    currentBuildContextCompactionReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(
        await readFile(currentBuildContextCompactionReference),
      ),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildContextCompactionReferenceSize.width ||
      reference.height !== currentBuildContextCompactionReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build context-compaction reference must be exactly ${currentBuildContextCompactionReferenceSize.width}x${currentBuildContextCompactionReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.width !== currentBuildContextCompactionReferenceSize.width ||
      actual.height !== currentBuildContextCompactionReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build context-compaction comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const masks = [
      { height: 820, left: 0, top: 0, width: 274 },
      { height: 47, left: 274, top: 0, width: 906 },
      { height: 168, left: 350, top: 47, width: 745 },
      { height: 650, left: 1080, top: 47, width: 22 },
      { height: 650, left: 1168, top: 47, width: 12 },
      { height: 80, left: 368, top: 714, width: 680 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), masks),
      maskPng(clonePng(actual), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CONTEXT_COMPACTION_MAX_DIFF_RATIO",
      0.005,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actual),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build context-compaction pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build context-compaction pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "context-summary-open" &&
    currentBuildContextSummaryReference
  ) {
    const reference = flattenPng(
      PNG.sync.read(await readFile(currentBuildContextSummaryReference)),
      { blue: 24, green: 24, red: 24 },
    );
    if (
      reference.width !== currentBuildContextSummaryReferenceSize.width ||
      reference.height !== currentBuildContextSummaryReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build context-summary reference must be exactly ${currentBuildContextSummaryReferenceSize.width}x${currentBuildContextSummaryReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.width !== currentBuildContextSummaryReferenceSize.width ||
      actual.height !== currentBuildContextSummaryReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build context-summary comparison requires an exact 1180x820 playground frame.`,
      );
    }
    const panelBounds = {
      height: 199,
      left: 804,
      top: 45,
      width: 300,
    };
    const referencePanel = cropPng(
      reference,
      panelBounds.left,
      panelBounds.top,
      panelBounds.width,
      panelBounds.height,
    );
    const actualPanel = cropPng(
      actual,
      panelBounds.left,
      panelBounds.top,
      panelBounds.width,
      panelBounds.height,
    );
    const comparison = comparePng(referencePanel, actualPanel);
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CONTEXT_SUMMARY_MAX_DIFF_RATIO",
      0.03,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(actualPanel),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(artifactDirectory, `${scene.id}.current-build.diff.png`),
        PNG.sync.write(comparison.diff),
      );
    }
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current-build context-summary pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current-build context-summary pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "subagent-current-summary-completed" &&
    currentBuildSubagentSummaryReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: { height: 241, left: 804, top: 45, width: 300 },
      defaultMaximumRatio: 0.055,
      masks: [],
      maximumRatioName: "CODEX_UI_KIT_SUBAGENT_SUMMARY_MAX_DIFF_RATIO",
      referenceCrop: { height: 241, left: 804, top: 45, width: 300 },
      referencePath: currentBuildSubagentSummaryReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "subagent-current-panel-completed" &&
    currentBuildSubagentPanelReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      defaultMaximumRatio: 0.045,
      masks: [{ height: 32, left: 328, top: 170, width: 42 }],
      maximumRatioName: "CODEX_UI_KIT_SUBAGENT_PANEL_MAX_DIFF_RATIO",
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentPanelReference,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "subagent-current-transcript" &&
    currentBuildSubagentTranscriptReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      defaultMaximumRatio: 0.045,
      masks: [],
      maximumRatioName:
        "CODEX_UI_KIT_SUBAGENT_TRANSCRIPT_MAX_DIFF_RATIO",
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentTranscriptReference,
      sceneId: scene.id,
    });
  }

  const currentSubagentCollaborationOverlay = {
    "subagent-concurrent-summary-running": {
      actualBounds: { height: 241, left: 804, top: 45, width: 300 },
      referenceCrop: { height: 241, left: 504, top: 45, width: 300 },
      referencePath: currentBuildSubagentConcurrentSummaryReference,
    },
    "subagent-concurrent-summary-mixed": {
      actualBounds: { height: 241, left: 804, top: 45, width: 300 },
      referenceCrop: { height: 241, left: 504, top: 45, width: 300 },
      referencePath: currentBuildSubagentConcurrentMixedReference,
    },
    "subagent-concurrent-panel-mixed": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      masks: [{ height: 32, left: 328, top: 66, width: 42 }],
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentConcurrentMixedReference,
    },
    "subagent-concurrent-panel-completed": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      masks: [
        { height: 32, left: 328, top: 170, width: 42 },
        { height: 32, left: 328, top: 228, width: 42 },
      ],
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentConcurrentCompletedReference,
    },
    "subagent-concurrent-transcript-beta": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentConcurrentTranscriptReference,
    },
    "subagent-nested-panel-running": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      masks: [
        { height: 32, left: 328, top: 66, width: 42 },
        { height: 32, left: 328, top: 124, width: 42 },
      ],
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentNestedRunningReference,
    },
    "subagent-nested-panel-mixed": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      masks: [
        { height: 32, left: 328, top: 66, width: 42 },
        { height: 32, left: 328, top: 170, width: 42 },
      ],
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentNestedMixedReference,
    },
    "subagent-nested-panel-completed": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      masks: [
        { height: 32, left: 328, top: 170, width: 42 },
        { height: 32, left: 328, top: 228, width: 42 },
      ],
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentNestedCompletedReference,
    },
    "subagent-nested-transcript-child": {
      actualBounds: { height: 820, left: 810, top: 0, width: 370 },
      referenceCrop: { height: 820, left: 810, top: 0, width: 370 },
      referencePath: currentBuildSubagentNestedTranscriptReference,
    },
  }[scene.id];
  if (currentSubagentCollaborationOverlay?.referencePath) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: currentSubagentCollaborationOverlay.actualBounds,
      defaultMaximumRatio: 0.055,
      masks: currentSubagentCollaborationOverlay.masks ?? [],
      maximumRatioName:
        "CODEX_UI_KIT_SUBAGENT_COLLABORATION_MAX_DIFF_RATIO",
      referenceCrop: currentSubagentCollaborationOverlay.referenceCrop,
      referencePath: currentSubagentCollaborationOverlay.referencePath,
      sceneId: scene.id,
    });
  }

  if (
    scene.id === "subagent-nested-panel-running" &&
    currentBuildSubagentNestedRunningReference
  ) {
    await compareCurrentBuildOverlay({
      actual,
      actualBounds: { height: 115, left: 290, top: 232, width: 205 },
      // This compact text-heavy crop has little blank surface to dilute
      // one-pixel font-rasterization differences between packaged Electron
      // and the local harness, so it uses its own regional budget.
      defaultMaximumRatio: 0.125,
      masks: [
        { height: 28, left: 0, top: 0, width: 24 },
        { height: 28, left: 0, top: 87, width: 24 },
      ],
      maximumRatioName: "CODEX_UI_KIT_SUBAGENT_ACTIVITY_MAX_DIFF_RATIO",
      referenceCrop: { height: 115, left: 290, top: 45, width: 205 },
      referencePath: currentBuildSubagentNestedRunningReference,
      sceneId: "subagent-nested-main-activity-running",
    });
  }

  if (scene.id === "multi-file-review" && currentBuildMultiFileReference) {
    const reference = PNG.sync.read(
      await readFile(currentBuildMultiFileReference),
    );
    if (
      reference.width !== currentBuildMultiFileReferenceSize.width ||
      reference.height !== currentBuildMultiFileReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildMultiFileReferenceSize.width}x${currentBuildMultiFileReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }
    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const comparison = comparePng(reference, main);
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const split = Math.round(reference.width * (536 / 906));
    const conversationComparison = comparePng(
      cropPng(reference, 0, 0, split, reference.height),
      cropPng(main, 0, 0, split, reference.height),
    );
    const reviewComparison = comparePng(
      cropPng(
        reference,
        split,
        0,
        reference.width - split,
        reference.height,
      ),
      cropPng(main, split, 0, reference.width - split, reference.height),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_MULTI_FILE_REVIEW_MAX_DIFF_RATIO",
      0.07,
    );
    const maximumConversationRatio = environmentRatio(
      "CODEX_UI_KIT_MULTI_FILE_REVIEW_CONVERSATION_MAX_DIFF_RATIO",
      0.065,
    );
    const maximumReviewRatio = environmentRatio(
      "CODEX_UI_KIT_MULTI_FILE_REVIEW_PANEL_MAX_DIFF_RATIO",
      0.08,
    );
    if (
      comparison.ratio > maximumRatio ||
      conversationComparison.ratio > maximumConversationRatio ||
      reviewComparison.ratio > maximumReviewRatio
    ) {
      throw new Error(
        `${scene.id}: current-build pixel ratios ${JSON.stringify({
          conversation: conversationComparison.ratio,
          full: comparison.ratio,
          review: reviewComparison.ratio,
        })} exceed ${JSON.stringify({
          conversation: maximumConversationRatio,
          full: maximumRatio,
          review: maximumReviewRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build pixel ratios ${JSON.stringify({
        conversation: conversationComparison.ratio,
        full: comparison.ratio,
        review: reviewComparison.ratio,
      })}`,
    );
  }

  if (
    scene.id === "current-review-rename" &&
    currentBuildReviewRenameReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentBuildReviewRenameReference),
    );
    if (
      reference.width !== currentBuildReviewRenameReferenceSize.width ||
      reference.height !== currentBuildReviewRenameReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildReviewRenameReferenceSize.width}x${currentBuildReviewRenameReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }
    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const split = 536;
    const comparison = comparePng(reference, main);
    const conversationComparison = comparePng(
      cropPng(reference, 0, 0, split, reference.height),
      cropPng(main, 0, 0, split, reference.height),
    );
    const reviewComparison = comparePng(
      cropPng(reference, split, 0, reference.width - split, reference.height),
      cropPng(main, split, 0, reference.width - split, reference.height),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_REVIEW_MAX_DIFF_RATIO",
      0.065,
    );
    const maximumConversationRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_REVIEW_CONVERSATION_MAX_DIFF_RATIO",
      0.055,
    );
    const maximumReviewRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_REVIEW_PANEL_MAX_DIFF_RATIO",
      0.08,
    );
    await writeFile(
      join(artifactDirectory, `${scene.id}.current-build.png`),
      PNG.sync.write(main),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        join(
          artifactDirectory,
          `${scene.id}.current-build.diff.png`,
        ),
        PNG.sync.write(comparison.diff),
      );
    }
    if (
      comparison.ratio > maximumRatio ||
      conversationComparison.ratio > maximumConversationRatio ||
      reviewComparison.ratio > maximumReviewRatio
    ) {
      throw new Error(
        `${scene.id}: current-build pixel ratios ${JSON.stringify({
          conversation: conversationComparison.ratio,
          full: comparison.ratio,
          review: reviewComparison.ratio,
        })} exceed ${JSON.stringify({
          conversation: maximumConversationRatio,
          full: maximumRatio,
          review: maximumReviewRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build pixel ratios ${JSON.stringify({
        conversation: conversationComparison.ratio,
        full: comparison.ratio,
        review: reviewComparison.ratio,
      })}`,
    );
  }

  if (scene.id === "pull-request-detail" && currentBuildPullRequestReference) {
    const reference = PNG.sync.read(
      await readFile(currentBuildPullRequestReference),
    );
    if (
      reference.width !== currentBuildPullRequestReferenceSize.width ||
      reference.height !== currentBuildPullRequestReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildPullRequestReferenceSize.width}x${currentBuildPullRequestReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }
    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const comparison = comparePng(reference, main);
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const split = 353;
    const indexComparison = comparePng(
      cropPng(reference, 0, 0, split, reference.height),
      cropPng(main, 0, 0, split, reference.height),
    );
    const detailComparison = comparePng(
      cropPng(
        reference,
        split,
        0,
        reference.width - split,
        reference.height,
      ),
      cropPng(main, split, 0, reference.width - split, reference.height),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_PULL_REQUEST_MAX_DIFF_RATIO",
      0.065,
    );
    const maximumIndexRatio = environmentRatio(
      "CODEX_UI_KIT_PULL_REQUEST_INDEX_MAX_DIFF_RATIO",
      0.055,
    );
    const maximumDetailRatio = environmentRatio(
      "CODEX_UI_KIT_PULL_REQUEST_DETAIL_MAX_DIFF_RATIO",
      0.07,
    );
    if (
      comparison.ratio > maximumRatio ||
      indexComparison.ratio > maximumIndexRatio ||
      detailComparison.ratio > maximumDetailRatio
    ) {
      throw new Error(
        `${scene.id}: current-build pixel ratios ${JSON.stringify({
          detail: detailComparison.ratio,
          full: comparison.ratio,
          index: indexComparison.ratio,
        })} exceed ${JSON.stringify({
          detail: maximumDetailRatio,
          full: maximumRatio,
          index: maximumIndexRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build pixel ratios ${JSON.stringify({
        detail: detailComparison.ratio,
        full: comparison.ratio,
        index: indexComparison.ratio,
      })}`,
    );
  }

  if (
    scene.id === "terminal-current-single" &&
    currentBuildTerminalReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentBuildTerminalReference),
    );
    if (
      reference.width !== currentBuildTerminalReferenceSize.width ||
      reference.height !== currentBuildTerminalReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildTerminalReferenceSize.width}x${currentBuildTerminalReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }
    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const comparison = comparePng(reference, main);
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const terminalTop = 548;
    const terminalHeaderHeight = 33;
    const terminalHeight = 272;
    const panelComparison = comparePng(
      cropPng(reference, 0, terminalTop, reference.width, terminalHeight),
      cropPng(main, 0, terminalTop, main.width, terminalHeight),
    );
    const contentComparison = comparePng(
      cropPng(
        reference,
        0,
        terminalTop + terminalHeaderHeight,
        reference.width,
        terminalHeight - terminalHeaderHeight,
      ),
      cropPng(
        main,
        0,
        terminalTop + terminalHeaderHeight,
        main.width,
        terminalHeight - terminalHeaderHeight,
      ),
    );
    const maximumPanelRatio = environmentRatio(
      "CODEX_UI_KIT_TERMINAL_PANEL_MAX_DIFF_RATIO",
      0.02,
    );
    const maximumContentRatio = environmentRatio(
      "CODEX_UI_KIT_TERMINAL_CONTENT_MAX_DIFF_RATIO",
      0.01,
    );
    if (
      panelComparison.ratio > maximumPanelRatio ||
      contentComparison.ratio > maximumContentRatio
    ) {
      throw new Error(
        `${scene.id}: current-build Terminal pixel ratios ${JSON.stringify({
          content: contentComparison.ratio,
          full: comparison.ratio,
          panel: panelComparison.ratio,
        })} exceed ${JSON.stringify({
          content: maximumContentRatio,
          panel: maximumPanelRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build Terminal pixel ratios ${JSON.stringify({
        content: contentComparison.ratio,
        full: comparison.ratio,
        panel: panelComparison.ratio,
      })}`,
    );
  }

  if (scene.id === "markdown-complete" && currentBuildMarkdownReference) {
    const reference = PNG.sync.read(
      await readFile(currentBuildMarkdownReference),
    );
    if (
      reference.width !== currentBuildMarkdownReferenceSize.width ||
      reference.height !== currentBuildMarkdownReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildMarkdownReferenceSize.width}x${currentBuildMarkdownReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }

    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const comparison = comparePng(reference, main);
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const regions = {
      assistant: { height: 389, left: 84, top: 235, width: 738 },
      code: { height: 72, left: 84, top: 520, width: 738 },
      composer: { height: 99, left: 84, top: 706, width: 738 },
    };
    const compareRegion = ({ height, left, top, width }) =>
      comparePng(
        cropPng(reference, left, top, width, height),
        cropPng(main, left, top, width, height),
      );
    const assistantComparison = compareRegion(regions.assistant);
    const codeComparison = compareRegion(regions.code);
    const composerComparison = compareRegion(regions.composer);
    const maximumAssistantRatio = environmentRatio(
      "CODEX_UI_KIT_MARKDOWN_ASSISTANT_MAX_DIFF_RATIO",
      0.02,
    );
    const maximumCodeRatio = environmentRatio(
      "CODEX_UI_KIT_MARKDOWN_CODE_MAX_DIFF_RATIO",
      0.02,
    );
    const maximumComposerRatio = environmentRatio(
      "CODEX_UI_KIT_MARKDOWN_COMPOSER_MAX_DIFF_RATIO",
      0.025,
    );
    if (
      assistantComparison.ratio > maximumAssistantRatio ||
      codeComparison.ratio > maximumCodeRatio ||
      composerComparison.ratio > maximumComposerRatio
    ) {
      throw new Error(
        `${scene.id}: current-build Markdown pixel ratios ${JSON.stringify({
          assistant: assistantComparison.ratio,
          code: codeComparison.ratio,
          composer: composerComparison.ratio,
          full: comparison.ratio,
        })} exceed ${JSON.stringify({
          assistant: maximumAssistantRatio,
          code: maximumCodeRatio,
          composer: maximumComposerRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build Markdown pixel ratios ${JSON.stringify({
        assistant: assistantComparison.ratio,
        code: codeComparison.ratio,
        composer: composerComparison.ratio,
        full: comparison.ratio,
      })}`,
    );
  }

  const currentMarkdownReference =
    scene.id === "markdown-current-26-818"
      ? currentMarkdown26818Reference
      : scene.id === "markdown-current-26-818-compact"
        ? currentMarkdown26818CompactReference
        : null;
  if (currentMarkdownReference) {
    const compact = scene.id.endsWith("-compact");
    const expected = compact
      ? { height: 358, width: 688 }
      : { height: 358, width: 736 };
    const reference = PNG.sync.read(await readFile(currentMarkdownReference));
    if (
      reference.width !== expected.width ||
      reference.height !== expected.height
    ) {
      throw new Error(
        `${scene.id}: current 26.818 Markdown reference must be exactly ${expected.width}x${expected.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    const main = cropPng(
      actual,
      compact ? 16 : 359,
      compact ? 95 : 235,
      expected.width,
      expected.height,
    );
    const comparison = comparePng(reference, main);
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }
    const maximumRatio = environmentRatio(
      compact
        ? "CODEX_UI_KIT_CURRENT_MARKDOWN_26_818_COMPACT_MAX_DIFF_RATIO"
        : "CODEX_UI_KIT_CURRENT_MARKDOWN_26_818_MAX_DIFF_RATIO",
      0.013,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.818 Markdown pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.818 Markdown pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "markdown-current-26-825" &&
    currentMarkdown26825Reference
  ) {
    const expected = { height: 466, width: 737 };
    const reference = PNG.sync.read(
      await readFile(currentMarkdown26825Reference),
    );
    if (
      reference.width !== expected.width ||
      reference.height !== expected.height
    ) {
      throw new Error(
        `${scene.id}: current 26.825 Markdown response reference must be exactly ${expected.width}x${expected.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    const main = cropPng(actual, 383, 161, expected.width, expected.height);
    const comparison = comparePng(reference, main);
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MARKDOWN_26_825_MAX_DIFF_RATIO",
      0.02,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current 26.825 Markdown response pixel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current 26.825 Markdown response pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "markdown-table-actions-preview" &&
    currentBuildMarkdownTablePreviewReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentBuildMarkdownTablePreviewReference),
    );
    if (
      reference.width !== currentBuildMarkdownTablePreviewReferenceSize.width ||
      reference.height !== currentBuildMarkdownTablePreviewReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference and actual must both be 1180x820, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const regions = {
      close: { height: 44, left: 1124, top: 10, width: 46 },
      preview: { height: 392, left: 142, top: 212, width: 896 },
    };
    const compareRegion = ({ height, left, top, width }) =>
      comparePng(
        cropPng(reference, left, top, width, height),
        cropPng(actual, left, top, width, height),
      );
    const closeComparison = compareRegion(regions.close);
    const previewComparison = compareRegion(regions.preview);
    const maximumCloseRatio = environmentRatio(
      "CODEX_UI_KIT_MARKDOWN_TABLE_CLOSE_MAX_DIFF_RATIO",
      0.01,
    );
    const maximumPreviewRatio = environmentRatio(
      "CODEX_UI_KIT_MARKDOWN_TABLE_PREVIEW_MAX_DIFF_RATIO",
      0.04,
    );
    if (
      closeComparison.ratio > maximumCloseRatio ||
      previewComparison.ratio > maximumPreviewRatio
    ) {
      throw new Error(
        `${scene.id}: current-build table-preview pixel ratios ${JSON.stringify({ close: closeComparison.ratio, preview: previewComparison.ratio })} exceed ${JSON.stringify({ close: maximumCloseRatio, preview: maximumPreviewRatio })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build table-preview pixel ratios ${JSON.stringify({ close: closeComparison.ratio, preview: previewComparison.ratio })}`,
    );
  }

  if (scene.id === "mcp-tool-calls" && currentBuildMcpReference) {
    const reference = PNG.sync.read(
      await readFile(currentBuildMcpReference),
    );
    if (
      reference.width !== currentBuildMcpReferenceSize.width ||
      reference.height !== currentBuildMcpReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build reference must be exactly ${currentBuildMcpReferenceSize.width}x${currentBuildMcpReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }

    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const currentBuildMcpTextMasks = [
      { height: 46, left: 0, top: 0, width: 906 },
      { height: 82, left: 266, top: 90, width: 540 },
      { height: 28, left: 84, top: 225, width: 135 },
      { height: 47, left: 84, top: 272, width: 738 },
      { height: 82, left: 106, top: 328, width: 300 },
      { height: 600, left: 895, top: 48, width: 11 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), currentBuildMcpTextMasks),
      maskPng(clonePng(main), currentBuildMcpTextMasks),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const regions = {
      answer: { height: 76, left: 84, top: 344, width: 738 },
      composer: { height: 99, left: 84, top: 706, width: 738 },
      toolCalls: { height: 214, left: 84, top: 135, width: 738 },
    };
    const compareRegion = ({ height, left, top, width }, masks = []) =>
      comparePng(
        maskPng(
          cropPng(reference, left, top, width, height),
          masks,
        ),
        maskPng(cropPng(main, left, top, width, height), masks),
      );
    const answerComparison = compareRegion(regions.answer);
    const composerComparison = compareRegion(regions.composer);
    const toolCallsComparison = compareRegion(regions.toolCalls, [
      { height: 42, left: 182, top: 0, width: 540 },
      { height: 28, left: 0, top: 90, width: 135 },
      { height: 47, left: 0, top: 137, width: 738 },
      { height: 21, left: 22, top: 193, width: 300 },
    ]);
    const maximumAnswerRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_ANSWER_MAX_DIFF_RATIO",
      0.04,
    );
    const maximumComposerRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_COMPOSER_MAX_DIFF_RATIO",
      0.025,
    );
    const maximumToolCallsRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_TOOL_CALLS_MAX_DIFF_RATIO",
      0.04,
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_MAX_DIFF_RATIO",
      0.03,
    );
    if (
      answerComparison.ratio > maximumAnswerRatio ||
      composerComparison.ratio > maximumComposerRatio ||
      comparison.ratio > maximumRatio ||
      toolCallsComparison.ratio > maximumToolCallsRatio
    ) {
      throw new Error(
        `${scene.id}: current-build MCP pixel ratios ${JSON.stringify({
          answer: answerComparison.ratio,
          composer: composerComparison.ratio,
          full: comparison.ratio,
          toolCalls: toolCallsComparison.ratio,
        })} exceed ${JSON.stringify({
          answer: maximumAnswerRatio,
          composer: maximumComposerRatio,
          full: maximumRatio,
          toolCalls: maximumToolCallsRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build MCP pixel ratios ${JSON.stringify({
        answer: answerComparison.ratio,
        composer: composerComparison.ratio,
        full: comparison.ratio,
        toolCalls: toolCallsComparison.ratio,
      })}`,
    );
  }

  if (
    scene.id === "mcp-recovery-completed" &&
    currentBuildMcpRecoveryReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentBuildMcpRecoveryReference),
    );
    if (
      reference.width !== currentBuildMcpRecoveryReferenceSize.width ||
      reference.height !== currentBuildMcpRecoveryReferenceSize.height
    ) {
      throw new Error(
        `${scene.id}: current-build recovery reference must be exactly ${currentBuildMcpRecoveryReferenceSize.width}x${currentBuildMcpRecoveryReferenceSize.height}, received ${reference.width}x${reference.height}.`,
      );
    }
    if (
      actual.height !== reference.height ||
      actual.width < reference.width
    ) {
      throw new Error(
        `${scene.id}: current-build recovery reference ${reference.width}x${reference.height} cannot be aligned to ${actual.width}x${actual.height}.`,
      );
    }

    const main = cropPng(
      actual,
      actual.width - reference.width,
      0,
      reference.width,
      reference.height,
    );
    const currentBuildActualPath = join(
      artifactDirectory,
      `${scene.id}.current-build.png`,
    );
    const currentBuildDiffPath = join(
      artifactDirectory,
      `${scene.id}.current-build.diff.png`,
    );
    await writeFile(currentBuildActualPath, PNG.sync.write(main));

    const currentBuildRecoveryTextMasks = [
      { height: 46, left: 0, top: 0, width: 906 },
      { height: 18, left: 84, top: 46, width: 160 },
      { height: 45, left: 84, top: 76, width: 738 },
      { height: 25, left: 106, top: 134, width: 170 },
      { height: 60, left: 92, top: 163, width: 180 },
      { height: 28, left: 84, top: 272, width: 738 },
      { height: 120, left: 106, top: 313, width: 310 },
      { height: 600, left: 895, top: 48, width: 11 },
    ];
    const comparison = comparePng(
      maskPng(clonePng(reference), currentBuildRecoveryTextMasks),
      maskPng(clonePng(main), currentBuildRecoveryTextMasks),
    );
    if (comparison.pixels > 0) {
      await writeFile(
        currentBuildDiffPath,
        PNG.sync.write(comparison.diff),
      );
    }

    const regions = {
      composer: { height: 99, left: 84, top: 706, width: 738 },
      recovery: { height: 340, left: 84, top: 245, width: 738 },
      upper: { height: 145, left: 84, top: 70, width: 738 },
    };
    const compareRegion = ({ height, left, top, width }, masks = []) =>
      comparePng(
        maskPng(
          cropPng(reference, left, top, width, height),
          masks,
        ),
        maskPng(cropPng(main, left, top, width, height), masks),
      );
    const composerComparison = compareRegion(regions.composer);
    const recoveryComparison = compareRegion(regions.recovery, [
      { height: 35, left: 0, top: 25, width: 738 },
      { height: 125, left: 22, top: 65, width: 310 },
    ]);
    const upperComparison = compareRegion(regions.upper, [
      { height: 47, left: 0, top: 6, width: 738 },
      { height: 30, left: 22, top: 60, width: 170 },
      { height: 55, left: 8, top: 90, width: 180 },
    ]);
    const maximumComposerRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_RECOVERY_COMPOSER_MAX_DIFF_RATIO",
      0.03,
    );
    const maximumRecoveryRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_RECOVERY_TOOL_MAX_DIFF_RATIO",
      0.07,
    );
    const maximumUpperRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_RECOVERY_UPPER_MAX_DIFF_RATIO",
      Number(
        process.env.CODEX_UI_KIT_MCP_RECOVERY_USER_MAX_DIFF_RATIO ??
          0.05,
      ),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_MCP_RECOVERY_MAX_DIFF_RATIO",
      0.045,
    );
    if (
      composerComparison.ratio > maximumComposerRatio ||
      comparison.ratio > maximumRatio ||
      recoveryComparison.ratio > maximumRecoveryRatio ||
      upperComparison.ratio > maximumUpperRatio
    ) {
      throw new Error(
        `${scene.id}: current-build MCP recovery pixel ratios ${JSON.stringify({
          composer: composerComparison.ratio,
          full: comparison.ratio,
          recovery: recoveryComparison.ratio,
          upper: upperComparison.ratio,
        })} exceed ${JSON.stringify({
          composer: maximumComposerRatio,
          full: maximumRatio,
          recovery: maximumRecoveryRatio,
          upper: maximumUpperRatio,
        })}.`,
      );
    }
    console.log(
      `${scene.id}: current-build MCP recovery pixel ratios ${JSON.stringify({
        composer: composerComparison.ratio,
        full: comparison.ratio,
        recovery: recoveryComparison.ratio,
        upper: upperComparison.ratio,
      })}`,
    );
  }

  if (scene.id === "mcp-current-success" && currentMcpSuccessReference) {
    const reference = PNG.sync.read(
      await readFile(currentMcpSuccessReference),
    );
    if (
      reference.width !== currentMcpSuccessReferenceSize.width ||
      reference.height !== currentMcpSuccessReferenceSize.height ||
      actual.width !== 1180 ||
      actual.height !== 820
    ) {
      throw new Error(
        `${scene.id}: current MCP success comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 323, 305, 736, 80),
      cropPng(actual, 359, 239, 736, 80),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_SUCCESS_MAX_DIFF_RATIO",
      0.02,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current MCP success tool-group ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current MCP success tool-group pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-recovery-compact" &&
    currentMcpRecoveryCompactReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcpRecoveryCompactReference),
    );
    if (
      reference.width !== currentMcpRecoveryCompactReferenceSize.width ||
      reference.height !== currentMcpRecoveryCompactReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current MCP recovery comparison requires exact 720x680 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 16, 293, 688, 67),
      cropPng(actual, 16, 278, 688, 67),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_RECOVERY_COMPACT_MAX_DIFF_RATIO",
      0.0121,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current MCP compact recovery-card ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current MCP compact recovery-card pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-818-success" &&
    currentMcp26818SuccessReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26818SuccessReference),
    );
    if (
      reference.width !== currentMcp26818SuccessReferenceSize.width ||
      reference.height !== currentMcp26818SuccessReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.818 MCP success comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 222, 273, 736, 71),
      cropPng(actual, 222, 276, 736, 71),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_SUCCESS_26_818_MAX_DIFF_RATIO",
      0.025,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.818 MCP success group ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.818 MCP success group pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-818-recovery-compact" &&
    currentMcp26818RecoveryCompactReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26818RecoveryCompactReference),
    );
    if (
      reference.width !==
        currentMcp26818RecoveryCompactReferenceSize.width ||
      reference.height !==
        currentMcp26818RecoveryCompactReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.818 MCP recovery comparison requires exact 720x680 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 16, 271, 688, 68),
      cropPng(actual, 16, 271, 688, 68),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_818_COMPACT_MAX_DIFF_RATIO",
      0.013,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.818 MCP recovery-card ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.818 MCP recovery-card pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-818-sources-pinned" &&
    currentMcp26818SourcesReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26818SourcesReference),
    );
    if (
      reference.width !== currentMcp26818SourcesReferenceSize.width ||
      reference.height !== currentMcp26818SourcesReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.818 MCP Sources comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 864, 59, 300, 189),
      cropPng(actual, 864, 59, 300, 189),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_SOURCES_26_818_MAX_DIFF_RATIO",
      0.03,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.818 MCP Sources panel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.818 MCP Sources panel pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-820-success" &&
    currentMcp26820SuccessReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26820SuccessReference),
    );
    if (
      reference.width !== currentMcp26820WideReferenceSize.width ||
      reference.height !== currentMcp26820WideReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.820 MCP success comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 222, 255, 736, 205),
      cropPng(actual, 222, 255, 736, 205),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_SUCCESS_26_820_MAX_DIFF_RATIO",
      0.023,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.820 MCP success region ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.820 MCP success region pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-820-recovery-failed" &&
    currentMcp26820FailureReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26820FailureReference),
    );
    if (
      reference.width !== currentMcp26820WideReferenceSize.width ||
      reference.height !== currentMcp26820WideReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.820 failed MCP comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 222, 237, 736, 90),
      cropPng(actual, 222, 216, 736, 90),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_FAILURE_26_820_MAX_DIFF_RATIO",
      0.034,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.820 failed MCP row ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.820 failed MCP row pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-820-recovery-compact" &&
    currentMcp26820RecoveryCompactReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26820RecoveryCompactReference),
    );
    if (
      reference.width !== currentMcp26820CompactReferenceSize.width ||
      reference.height !== currentMcp26820CompactReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.820 MCP compact recovery comparison requires exact 720x680 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 16, 76, 688, 235),
      cropPng(actual, 16, 76, 688, 235),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_820_COMPACT_MAX_DIFF_RATIO",
      0.013,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.820 MCP compact recovery ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.820 MCP compact recovery pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-820-sources-pinned" &&
    currentMcp26820SourcesReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26820SourcesReference),
    );
    if (
      reference.width !== currentMcp26820WideReferenceSize.width ||
      reference.height !== currentMcp26820WideReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.820 MCP Sources comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const masks = [{ height: 14, left: 145, top: 0, width: 155 }];
    const comparison = comparePng(
      maskPng(cropPng(reference, 864, 59, 300, 189), masks),
      maskPng(cropPng(actual, 864, 59, 300, 189), masks),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_SOURCES_26_820_MAX_DIFF_RATIO",
      0.02,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.820 MCP Sources panel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.820 MCP Sources panel pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-825-success" &&
    currentMcp26825SuccessReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26825SuccessReference),
    );
    if (
      reference.width !== currentMcp26825WideReferenceSize.width ||
      reference.height !== currentMcp26825WideReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.825 MCP success comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 222, 258, 736, 170),
      cropPng(actual, 222, 258, 736, 170),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_SUCCESS_26_825_MAX_DIFF_RATIO",
      0.028,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.825 MCP success region ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.825 MCP success region pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-825-recovery" &&
    currentMcp26825RecoveryReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26825RecoveryReference),
    );
    if (
      reference.width !== currentMcp26825WideReferenceSize.width ||
      reference.height !== currentMcp26825WideReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.825 MCP recovery comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 222, 90, 736, 585),
      cropPng(actual, 222, 90, 736, 585),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_825_MAX_DIFF_RATIO",
      0.05,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.825 MCP recovery region ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.825 MCP recovery region pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-825-recovery-compact" &&
    currentMcp26825RecoveryCompactReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26825RecoveryCompactReference),
    );
    if (
      reference.width !== currentMcp26825CompactReferenceSize.width ||
      reference.height !== currentMcp26825CompactReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.825 compact MCP recovery comparison requires exact 720x680 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 16, 294, 688, 245),
      cropPng(actual, 16, 294, 688, 245),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_RECOVERY_26_825_COMPACT_MAX_DIFF_RATIO",
      0.041,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.825 compact MCP recovery ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.825 compact MCP recovery pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-26-825-sources-pinned" &&
    currentMcp26825SourcesReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentMcp26825SourcesReference),
    );
    if (
      reference.width !== currentMcp26825WideReferenceSize.width ||
      reference.height !== currentMcp26825WideReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: 26.825 MCP Sources comparison requires exact 1180x820 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 864, 59, 300, 313),
      cropPng(actual, 864, 59, 300, 313),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_MCP_SOURCES_26_825_MAX_DIFF_RATIO",
      0.031,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: 26.825 MCP Sources panel ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: 26.825 MCP Sources panel pixel ratio ${comparison.ratio}`,
    );
  }

  if (
    scene.id === "mcp-current-integration-recovered-compact" &&
    currentIntegrationRecoveryReference
  ) {
    const reference = PNG.sync.read(
      await readFile(currentIntegrationRecoveryReference),
    );
    if (
      reference.width !== currentIntegrationRecoveryReferenceSize.width ||
      reference.height !== currentIntegrationRecoveryReferenceSize.height ||
      actual.width !== reference.width ||
      actual.height !== reference.height
    ) {
      throw new Error(
        `${scene.id}: current integration recovery comparison requires exact 720x680 product and playground frames, received reference ${reference.width}x${reference.height} and actual ${actual.width}x${actual.height}.`,
      );
    }
    const comparison = comparePng(
      cropPng(reference, 16, 387, 688, 71),
      cropPng(actual, 16, 335, 688, 71),
    );
    const maximumRatio = environmentRatio(
      "CODEX_UI_KIT_CURRENT_INTEGRATION_RECOVERY_MAX_DIFF_RATIO",
      0.013,
    );
    if (comparison.ratio > maximumRatio) {
      throw new Error(
        `${scene.id}: current integration recovery group ratio ${comparison.ratio} exceeds ${maximumRatio}.`,
      );
    }
    console.log(
      `${scene.id}: current integration recovery group pixel ratio ${comparison.ratio}`,
    );
  }
}

if (regionalFailures.length > 0) {
  throw new Error(
    `Regional pixel contracts failed for ${regionalFailures.length} lifecycle frames:\n${regionalFailures.join("\n")}`,
  );
}

console.log(
  update
    ? `Updated ${selectedScenes.length} reviewed visual baselines.`
    : `Pixel contracts passed for ${selectedScenes.length} lifecycle frames.`,
);
