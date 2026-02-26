import type { Hooks } from "@opencode-ai/plugin"

import type { EnforcementLevel } from "../../config/schema"
import {
  BLOCK_MESSAGE,
  CODE_CHANGING_TOOLS,
  READ_ONLY_PREFIXES,
  READ_ONLY_TOOLS,
  TICKET_ALLOWLIST_TOOLS,
  WARN_MESSAGE,
} from "./constants"

type BeforeInput = { tool: string; sessionID?: string }
type BeforeOutput = { args: Record<string, unknown>; output?: string }
type AfterInput = { tool: string; sessionID?: string }

const codeChangingTools = new Set<string>(CODE_CHANGING_TOOLS)
const readOnlyTools = new Set<string>(READ_ONLY_TOOLS)
const ticketAllowlistTools = new Set<string>(TICKET_ALLOWLIST_TOOLS)

function hasReadOnlyPrefix(tool: string): boolean {
  for (const prefix of READ_ONLY_PREFIXES) {
    if (tool.startsWith(prefix)) {
      return true
    }
  }

  return false
}

export function createTicketEnforcementHook(_config?: {
  enforcement?: EnforcementLevel
}): Hooks & { markTicketActive: (sessionID: string) => void } {
  const enforcement = _config?.enforcement ?? "warn"
  const activeTicketSessions = new Set<string>()

  const markTicketActive = (sessionID: string): void => {
    activeTicketSessions.add(sessionID)
  }

  return {
    markTicketActive,
    "tool.execute.before": async (input: BeforeInput, output: BeforeOutput) => {
      if (enforcement === "off") {
        return
      }

      const toolName = input.tool

      if (readOnlyTools.has(toolName) || hasReadOnlyPrefix(toolName)) {
        return
      }

      if (toolName.startsWith("ticket_") || ticketAllowlistTools.has(toolName)) {
        return
      }

      if (!codeChangingTools.has(toolName)) {
        return
      }

      if (input.sessionID && activeTicketSessions.has(input.sessionID)) {
        return
      }

      if (enforcement === "warn") {
        output.output = `${output.output ?? ""}\n${WARN_MESSAGE}`.trim()
        return
      }

      if (enforcement === "block") {
        throw new Error(BLOCK_MESSAGE)
      }
    },
    "tool.execute.after": async (input: AfterInput) => {
      if (input.tool !== "ticket_start") {
        return
      }

      if (!input.sessionID) {
        return
      }

      activeTicketSessions.add(input.sessionID)
    },
  }
}
