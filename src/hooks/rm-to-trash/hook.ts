import type { Hooks } from "@opencode-ai/plugin"

import type { EnforcementLevel } from "../../config/schema"
import {
  BLOCK_MESSAGE,
  DANGEROUS_RM_PATTERNS,
  SAFE_RM_PATTERNS,
  TRASH_ALTERNATIVES,
  WARN_MESSAGE,
} from "./constants"

const PACKAGE_MANAGER_COMMAND_PATTERN = /^\s*(bun|npm|yarn|pnpm)\b/
const RM_COMMAND_PATTERN = /(^|[;&|]\s*|\b(?:sudo|xargs)\s+)\brm\b/

function hasRmCommand(command: string): boolean {
  return RM_COMMAND_PATTERN.test(command)
}

function matchesPattern(command: string, patterns: RegExp[]): boolean {
  for (const pattern of patterns) {
    if (pattern.test(command)) {
      return true
    }
  }

  return false
}

function resolveTrashCommand(): string {
  return process.platform === "darwin"
    ? TRASH_ALTERNATIVES.darwin
    : TRASH_ALTERNATIVES.linux
}

export function createRmToTrashHook(_config?: { enforcement?: EnforcementLevel }): Hooks {
  const enforcement = _config?.enforcement ?? "warn"

  return {
    "tool.execute.before": async (
      input: { tool: string },
      output: { args: Record<string, unknown>; output?: string }
    ) => {
      if (input.tool !== "bash") {
        return
      }

      const commandArg = output.args.command
      if (typeof commandArg !== "string") {
        return
      }

      const command = commandArg.trim()
      if (!command) {
        return
      }

      if (PACKAGE_MANAGER_COMMAND_PATTERN.test(command)) {
        return
      }

      if (!hasRmCommand(command)) {
        return
      }

      const isDangerous = matchesPattern(command, DANGEROUS_RM_PATTERNS)
      const isSafe = matchesPattern(command, SAFE_RM_PATTERNS)
      const isCI = process.env.CI === "true"

      if (isDangerous) {
        if (isCI) {
          output.output = `${output.output ?? ""}\n${BLOCK_MESSAGE(command)}`.trim()
          return
        }

        throw new Error(BLOCK_MESSAGE(command))
      }

      if (isSafe || enforcement === "off") {
        return
      }

      const warningMessage = WARN_MESSAGE(command, resolveTrashCommand())

      if (enforcement === "warn") {
        output.output = `${output.output ?? ""}\n${warningMessage}`.trim()
        return
      }

      if (isCI) {
        output.output = `${output.output ?? ""}\n${warningMessage}`.trim()
        return
      }

      if (enforcement === "block") {
        throw new Error(warningMessage)
      }

      return
    },
  }
}
