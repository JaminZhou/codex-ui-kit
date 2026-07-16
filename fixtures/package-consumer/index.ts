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
  ProposedPlan,
  TurnDuration,
  formatCommandDuration,
  formatTurnDuration,
  type FileDiffLine,
} from "codex-ui-kit";
import "codex-ui-kit/styles.css";
import "codex-ui-kit/tokens.css";

const line: FileDiffLine = {
  content: "package contract",
  kind: "context",
};
const highlighter: CodeHighlighter = (code) => ({ code, html: code });

void FileChange;
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
void formatTurnDuration;
void highlighter;
void line;
