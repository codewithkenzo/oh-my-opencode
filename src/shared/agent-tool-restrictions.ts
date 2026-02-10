/**
 * Agent tool restrictions for session.prompt calls.
 * OpenCode SDK's session.prompt `tools` parameter expects boolean values.
 * true = tool allowed, false = tool denied.
 */

import { findCaseInsensitive } from "./case-insensitive"

const EXPLORATION_AGENT_DENYLIST: Record<string, boolean> = {
  write: false,
  edit: false,
  task: false,
  delegate_task: false,
  call_omo_agent: false,
}

const AGENT_RESTRICTIONS: Record<string, Record<string, boolean>> = {
  "X1 - explorer": EXPLORATION_AGENT_DENYLIST,
  explore: EXPLORATION_AGENT_DENYLIST,  // Legacy

  "R2 - researcher": EXPLORATION_AGENT_DENYLIST,
  librarian: EXPLORATION_AGENT_DENYLIST,  // Legacy

  "K9 - advisor": {
    write: false,
    edit: false,
    task: false,
    delegate_task: false,
  },
  oracle: {  // Legacy
    write: false,
    edit: false,
    task: false,
    delegate_task: false,
  },


}

export function getAgentToolRestrictions(agentName: string): Record<string, boolean> {
  return findCaseInsensitive(AGENT_RESTRICTIONS, agentName) ?? {}
}

export function hasAgentToolRestrictions(agentName: string): boolean {
  const restrictions = findCaseInsensitive(AGENT_RESTRICTIONS, agentName)
  return restrictions !== undefined && Object.keys(restrictions).length > 0
}
