export interface SkillEnforcerState {
  sessionID: string;
  loadedSkills: Set<string>;
  suggestedSkills: Set<string>;
  filesAccessed: Set<string>;
  lastSuggestionTime: number;
  suggestionCount: number;
}
