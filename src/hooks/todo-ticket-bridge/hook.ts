import type { Hooks } from "@opencode-ai/plugin"

import type { EnforcementLevel } from "../../config/schema"
import { MIN_TODOS_FOR_SUGGESTION, SUGGESTION_MESSAGE } from "./constants"

export function createTodoTicketBridgeHook(_config?: {
  enforcement?: EnforcementLevel
}): Hooks {
  const enforcement = _config?.enforcement ?? "warn"

  return {
    "tool.execute.after": async (input, output) => {
      if (enforcement === "off" || enforcement === "block") {
        return
      }

      if (input.tool !== "todowrite") {
        return
      }

      const args = (output as { args?: unknown }).args as Record<string, unknown> | undefined
      const todos = args?.todos
      if (!Array.isArray(todos)) {
        return
      }

      if (todos.length < MIN_TODOS_FOR_SUGGESTION) {
        return
      }

      output.output = `${output.output ?? ""}\n${SUGGESTION_MESSAGE(todos.length)}`.trim()
    },
  }
}
