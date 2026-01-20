import type { CommandDefinition } from "../claude-code-command-loader/types"
import type { SkillMcpConfig } from "../skill-mcp-manager/types"

export type SkillScope = "builtin" | "config" | "user" | "project" | "opencode" | "opencode-project"

export interface SkillMetadata {
  name?: string
  description?: string
  model?: string
  "argument-hint"?: string
  agent?: string
  subtask?: boolean
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
  "allowed-tools"?: string
  mcp?: SkillMcpConfig
  /** If true, skill cannot be invoked by model - only via slash command */
  "disable-model-invocation"?: boolean
  /** If false, skill is hidden from slash command listing (default: true) */
  "user-invocable"?: boolean
  /** Execution context: 'fork' spawns subagent, 'inline' (default) executes in current context */
  context?: "fork" | "inline"
  /** Hook configuration (placeholder for v2, not implemented) */
  hooks?: SkillHookConfig
}

/** Placeholder type for skill-scoped hooks (v2 feature) */
export interface SkillHookConfig {
  // Reserved for future use
  [key: string]: unknown
}

export interface LazyContentLoader {
  loaded: boolean
  content?: string
  load: () => Promise<string>
}

export interface LoadedSkill {
  name: string
  path?: string
  resolvedPath?: string
  definition: CommandDefinition
  scope: SkillScope
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
  allowedTools?: string[]
  mcpConfig?: SkillMcpConfig
  lazyContent?: LazyContentLoader
  /** If true, skill cannot be invoked by model - only via slash command */
  disableModelInvocation?: boolean
  /** If false, skill is hidden from slash command listing (default: true) */
  userInvocable?: boolean
  /** Execution context: 'fork' spawns subagent, 'inline' (default) executes in current */
  context?: "fork" | "inline"
  /** Hook configuration (placeholder for v2) */
  hooks?: SkillHookConfig
}
