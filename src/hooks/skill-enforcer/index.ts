import type { PluginInput } from "@opencode-ai/plugin";
import type { SkillEnforcerState } from "./types";
import { SKILL_PATTERNS, ERROR_TRIGGERS, REMINDER_TEMPLATE } from "./constants";

interface ToolExecuteInput {
  tool: string;
  sessionID: string;
  callID: string;
}

interface ToolExecuteOutput {
  title: string;
  output: string;
  metadata: unknown;
}

interface EventInput {
  event: {
    type: string;
    properties?: unknown;
  };
}

function matchesGlob(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    const regex = new RegExp(
      "^" + pattern
        .replace(/\*\*/g, "[^/]+")
        .replace(/\*/g, ".*")
        .replace(/\?/g, "[^/]")
        .replace(/\./g, "\\.")
        .replace(/\.ts$/g, "\\.ts$")
        .replace(/\.tsx$/g, "\\.tsx$")
        .replace(/\.js$/g, "\\.js$")
        .replace(/\.jsx$/g, "\\.jsx$")
        + "$"
    );
    if (regex.test(filePath)) {
      return true;
    }
  }
  return false;
}

function getRecommendedSkills(filePath: string): string[] {
  const recommended = new Set<string>();
  for (const [_category, { globs, skills }] of Object.entries(SKILL_PATTERNS)) {
    if (matchesGlob(filePath, globs)) {
      skills.forEach(skill => recommended.add(skill));
    }
  }
  return Array.from(recommended);
}

function _containsError(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ERROR_TRIGGERS.some(trigger => lowerText.includes(trigger.toLowerCase()));
}

function buildReminder(skills: string[]): string {
  const skillsList = skills.join(", ");
  return REMINDER_TEMPLATE
    .replace("{{skills}}", skillsList)
    .replace("{{first_skill}}", skills[0]);
}

export function createSkillEnforcerHook(ctx: PluginInput) {
  const sessionStates = new Map<string, SkillEnforcerState>();
  const MAX_SUGGESTIONS = 3;

  function getOrCreateState(sessionID: string): SkillEnforcerState {
    if (!sessionStates.has(sessionID)) {
      const state: SkillEnforcerState = {
        sessionID,
        loadedSkills: new Set(),
        suggestedSkills: new Set(),
        filesAccessed: new Set(),
        lastSuggestionTime: 0,
        suggestionCount: 0
      };
      sessionStates.set(sessionID, state);
    }
    return sessionStates.get(sessionID)!;
  }

  function markSkillLoaded(sessionID: string, skillName: string): void {
    const state = getOrCreateState(sessionID);
    state.loadedSkills.add(skillName);
  }

  function markFileAccessed(sessionID: string, filePath: string): void {
    const state = getOrCreateState(sessionID);
    state.filesAccessed.add(filePath);
  }

  function shouldShowSuggestion(state: SkillEnforcerState, skillName: string): boolean {
    if (state.loadedSkills.has(skillName)) {
      return false;
    }
    if (state.suggestedSkills.has(skillName)) {
      return false;
    }
    if (state.suggestionCount >= MAX_SUGGESTIONS) {
      return false;
    }
    return true;
  }

  function recordSuggestion(state: SkillEnforcerState, skillName: string): void {
    state.suggestedSkills.add(skillName);
    state.lastSuggestionTime = Date.now();
    state.suggestionCount++;
  }

  function showToast(title: string, message: string): void {
    ctx.client.tui.showToast?.({
      body: {
        title,
        message,
        variant: "info",
        duration: 4000
      }
    }).catch(() => {});
  }

  const toolExecuteAfter = async (
    input: ToolExecuteInput,
    output: ToolExecuteOutput
  ) => {
    const { tool, sessionID } = input;

    if (tool === "skill") {
      const skillName = (input as any).name as string | undefined;
      if (skillName) {
        markSkillLoaded(sessionID, skillName);
      }
      return;
    }

    if (!["read", "write", "edit"].includes(tool)) {
      return;
    }

    const filePath = (input as any).path as string | undefined;
    if (!filePath) {
      return;
    }

    markFileAccessed(sessionID, filePath);

    const recommendedSkills = getRecommendedSkills(filePath);
    if (recommendedSkills.length === 0) {
      return;
    }

    const state = getOrCreateState(sessionID);
    const skillsToSuggest = recommendedSkills.filter(skill =>
      shouldShowSuggestion(state, skill)
    );

    if (skillsToSuggest.length === 0) {
      return;
    }

    const reminder = buildReminder(skillsToSuggest);
    output.output += reminder;

    skillsToSuggest.forEach(skill => recordSuggestion(state, skill));

    showToast(
      "Skill Suggestion",
      `Consider loading: ${skillsToSuggest.join(", ")}`
    );
  };

  const eventHandler = async ({ event }: EventInput) => {
    const props = event.properties as Record<string, unknown> | undefined;

    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined;
      if (sessionInfo?.id) {
        sessionStates.delete(sessionInfo.id);
      }
    }

    if (event.type === "session.compacted") {
      const sessionID = (props?.sessionID ??
        (props?.info as { id?: string } | undefined)?.id) as string | undefined;
      if (sessionID) {
        sessionStates.delete(sessionID);
      }
    }
  };

  return {
    "tool.execute.after": toolExecuteAfter,
    event: eventHandler
  };
}
