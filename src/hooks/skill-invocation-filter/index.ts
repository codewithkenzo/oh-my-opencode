/**
 * Shared utility module (not a standalone registered hook).
 * Exports `markSessionAsSlashCommand` consumed by:
 *   - src/hooks/auto-slash-command/index.ts
 *   - src/features/opencode-skill-loader/filtering.test.ts
 */
import type { PluginInput } from "@opencode-ai/plugin"
import { getSkillByName } from "../../features/opencode-skill-loader"
import { SYSTEM_DIRECTIVE_PREFIX } from "../../shared/system-directive"

const slashCommandSessions = new Set<string>()

export function markSessionAsSlashCommand(sessionId: string): void {
  slashCommandSessions.add(sessionId)
  setTimeout(() => slashCommandSessions.delete(sessionId), 5000)
}

export function isSlashCommandSession(sessionId: string): boolean {
  return slashCommandSessions.has(sessionId)
}

export function _resetForTesting(): void {
  slashCommandSessions.clear()
}

export function createSkillInvocationFilterHook(_ctx: PluginInput) {
  return {
    "tool.execute.before": async (
      input: { tool: string; sessionID: string; callID: string; args?: Record<string, unknown> },
      output: { args: Record<string, unknown>; message?: string; output?: string }
    ): Promise<void> => {
      if (input.tool !== "skill") return

      const skillName = input.args?.name as string
      if (!skillName) return

      const skill = await getSkillByName(skillName)
      if (!skill) return

      if (skill.scope === "builtin") return

      const sessionId = input.sessionID
      if (!sessionId) return

      const isFromSlashCommand = slashCommandSessions.has(sessionId)

      if (skill.disableModelInvocation && !isFromSlashCommand) {
        throw new Error(
          `${SYSTEM_DIRECTIVE_PREFIX}Skill "${skillName}" can only be invoked via slash command (/${skillName}). ` +
          `Model invocation is disabled for this skill.`
        )
      }
    },
  }
}
