import type { Hooks } from "@opencode-ai/plugin"

import type { EnforcementLevel } from "../../config/schema"
import { TEST_PATTERNS, TYPECHECK_PATTERNS, WARN_MESSAGE } from "./constants"

interface VerificationState {
  testsRun: boolean
  typecheckRun: boolean
}

export function createVerificationBeforeCompletionHook(_config?: {
  enforcement?: EnforcementLevel
}): Hooks & {
  getVerificationState: (sessionID: string) => VerificationState
  getReminder: (sessionID: string) => string | null
} {
  const enforcement = _config?.enforcement ?? "warn"
  const sessionState = new Map<string, VerificationState>()

  const getOrCreate = (sessionID: string): VerificationState => {
    if (!sessionState.has(sessionID)) {
      sessionState.set(sessionID, { testsRun: false, typecheckRun: false })
    }

    return sessionState.get(sessionID)!
  }

  const matchesAny = (text: string, patterns: RegExp[]): boolean =>
    patterns.some((pattern) => pattern.test(text))

  const getVerificationState = (sessionID: string): VerificationState => getOrCreate(sessionID)

  const getReminder = (sessionID: string): string | null => {
    if (enforcement === "off") return null

    const state = getOrCreate(sessionID)
    const missing: string[] = []
    if (!state.testsRun) missing.push("tests")
    if (!state.typecheckRun) missing.push("typecheck")
    if (missing.length === 0) return null

    return WARN_MESSAGE(missing)
  }

  return {
    getVerificationState,
    getReminder,
    "tool.execute.after": async (
      input: { tool: string; sessionID: string; callID: string },
      output: {
        title: string
        output: string
        metadata: unknown
        args?: Record<string, unknown>
      }
    ) => {
      if (input.tool !== "bash") return

      const command = output.args?.command
      if (typeof command !== "string") return

      const state = getOrCreate(input.sessionID)

      if (matchesAny(command, TEST_PATTERNS)) {
        state.testsRun = true
      }

      if (matchesAny(command, TYPECHECK_PATTERNS)) {
        state.typecheckRun = true
      }
    },
  }
}
