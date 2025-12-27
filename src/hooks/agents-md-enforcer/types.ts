export interface AgentsMdEnforcerState {
  sessionID: string;
  remindedDirectories: Set<string>;
  lastReminder: number;
  reminderCount: number;
}
