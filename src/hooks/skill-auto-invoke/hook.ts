import type { Hooks } from "@opencode-ai/plugin"

import { SKILL_MANDATE } from "./constants"

type ChatInput = {
  sessionID: string
  agent?: string
}

type ChatOutput = {
  parts: Array<{ type: string; text?: string }>
}

export function createSkillAutoInvokeHook(_config?: { enforcement?: "off" | "warn" }): Hooks {
  const enforcement = _config?.enforcement ?? "warn"
  const injectedSessions = new Set<string>()

  return {
    "chat.message": async (input: ChatInput, output: ChatOutput): Promise<void> => {
      if (enforcement === "off") {
        return
      }

      const sessionID = input.sessionID
      if (!sessionID) {
        return
      }

      if (injectedSessions.has(sessionID)) {
        return
      }

      if (input.agent) {
        return
      }

      injectedSessions.add(sessionID)

      const currentParts = output.parts
      if (currentParts.length === 0) {
        return
      }

      const lastPart = currentParts[currentParts.length - 1]
      if (lastPart.type === "text" && lastPart.text) {
        lastPart.text = `${lastPart.text}\n\n${SKILL_MANDATE}`
      }
    },
  }
}
