import type { PluginInput } from "@opencode-ai/plugin";
import type { SkillEnforcerState } from "./types";
import { REMINDER_TEMPLATE } from "./constants";
import { discoverAllSkills, matchSkillsForFile } from "./discovery";

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

function buildReminder(skillNames: string[]): string {
  const skillsList = skillNames.join(", ");
  return REMINDER_TEMPLATE
    .replace("{{skills}}", skillsList)
    .replace("{{first_skill}}", skillNames[0]);
}

export function createSkillEnforcerHook(ctx: PluginInput) {
  const sessionStates = new Map<string, SkillEnforcerState>();
  const discoveredSkills = discoverAllSkills(ctx.directory);
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

    const matchedSkills = matchSkillsForFile(discoveredSkills, filePath);
    if (matchedSkills.length === 0) {
      return;
    }

    const state = getOrCreateState(sessionID);
    const skillsToSuggest = matchedSkills
      .map(s => s.name)
      .filter(name => shouldShowSuggestion(state, name));

    if (skillsToSuggest.length === 0) {
      return;
    }

    const reminder = buildReminder(skillsToSuggest);
    output.output += reminder;

    skillsToSuggest.forEach(name => recordSuggestion(state, name));

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
