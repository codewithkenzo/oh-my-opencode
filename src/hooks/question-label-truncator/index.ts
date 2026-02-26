const MAX_LABEL_LENGTH = 30;

interface QuestionOption {
  label: string;
  description?: string;
}

interface Question {
  question: string;
  header?: string;
  options: QuestionOption[];
  multiSelect?: boolean;
}

interface AskUserQuestionArgs {
  questions: Question[];
}

function truncateLabel(label: string, maxLength: number = MAX_LABEL_LENGTH): string {
  if (label.length <= maxLength) {
    return label;
  }
  return label.substring(0, maxLength - 3) + "...";
}

function isAskUserQuestionArgs(args: unknown): args is AskUserQuestionArgs {
  if (!args || typeof args !== "object") {
    return false;
  }

  return Array.isArray((args as { questions?: unknown }).questions);
}

function truncateQuestionLabels(args: AskUserQuestionArgs): AskUserQuestionArgs {
  if (!args.questions || !Array.isArray(args.questions)) {
    return args;
  }

  return {
    ...args,
    questions: args.questions.map((question) => ({
      ...question,
      options: question.options?.map((option) => ({
        ...option,
        label: truncateLabel(option.label),
      })) ?? [],
    })),
  };
}

export function createQuestionLabelTruncatorHook() {
  return {
    "tool.execute.before": async (
      input: { tool: string },
      output: { args: Record<string, unknown> }
    ): Promise<void> => {
      const toolName = input.tool?.toLowerCase();

      if (toolName === "askuserquestion" || toolName === "ask_user_question") {
        const args = isAskUserQuestionArgs(output.args) ? output.args : undefined;

        if (args?.questions) {
          const truncatedArgs = truncateQuestionLabels(args);
          Object.assign(output.args, truncatedArgs);
        }
      }
    },
  };
}
