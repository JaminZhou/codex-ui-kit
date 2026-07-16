import {
  ActivityTimeline,
  AgentMarkdown,
  AgentPlan,
  AgentReasoning,
  CodeBlock,
  CommandExecution,
  CommandOutput,
  type CodeHighlighter,
  FileChange,
  FileDiff,
  ProposedPlan,
  TurnDuration,
  formatCommandDuration,
  fileDiffToText,
  formatTurnDuration,
  type FileDiffSize,
  type FileDiffLine,
} from "codex-ui-kit";
import "codex-ui-kit/styles.css";
import "codex-ui-kit/tokens.css";

const line: FileDiffLine = {
  content: "package contract",
  kind: "context",
};
const highlighter: CodeHighlighter = (code) => ({ code, html: code });
const diffSize: FileDiffSize = "short";

void FileChange;
void FileDiff;
void ActivityTimeline;
void AgentMarkdown;
void AgentPlan;
void AgentReasoning;
void CodeBlock;
void CommandExecution;
void CommandOutput;
void ProposedPlan;
void TurnDuration;
void formatCommandDuration;
void fileDiffToText([line]);
void formatTurnDuration;
void diffSize;
void highlighter;
void line;
