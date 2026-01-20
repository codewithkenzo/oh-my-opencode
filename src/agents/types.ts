import type { AgentConfig } from "@opencode-ai/sdk"

export type AgentFactory = (model: string) => AgentConfig

/**
 * Agent category for grouping in Sisyphus prompt sections
 */
export type AgentCategory = "exploration" | "specialist" | "advisor" | "utility"

/**
 * Cost classification for Tool Selection table
 */
export type AgentCost = "FREE" | "CHEAP" | "EXPENSIVE"

/**
 * Delegation trigger for Sisyphus prompt's Delegation Table
 */
export interface DelegationTrigger {
  /** Domain of work (e.g., "Frontend UI/UX") */
  domain: string
  /** When to delegate (e.g., "Visual changes only...") */
  trigger: string
}

/**
 * Metadata for generating Sisyphus prompt sections dynamically
 * This allows adding/removing agents without manually updating the Sisyphus prompt
 */
export interface AgentPromptMetadata {
  /** Category for grouping in prompt sections */
  category: AgentCategory

  /** Cost classification for Tool Selection table */
  cost: AgentCost

  /** Domain triggers for Delegation Table */
  triggers: DelegationTrigger[]

  /** When to use this agent (for detailed sections) */
  useWhen?: string[]

  /** When NOT to use this agent */
  avoidWhen?: string[]

  /** Optional dedicated prompt section (markdown) - for agents like Oracle that have special sections */
  dedicatedSection?: string

  /** Nickname/alias used in prompt (e.g., "Oracle" instead of "oracle") */
  promptAlias?: string

  /** Key triggers that should appear in Phase 0 (e.g., "External library mentioned → fire librarian") */
  keyTrigger?: string
}

export function isGptModel(model: string): boolean {
  return model.startsWith("openai/") || model.startsWith("github-copilot/gpt-")
}

export type BuiltinAgentName =
  // Orchestration (Opus)
  | "Musashi"
  | "Musashi - boulder"
  | "Musashi - plan"
  // Validation (Sonnet)
  | "M1 - analyst"
  | "M2 - reviewer"
  // Execution (Sonnet)
  | "J1 - junior"
  | "K9 - advisor"
  // Explorers (Grok/Flash)
  | "X1 - explorer"
  | "R2 - researcher"
  | "V1 - viewer"
  // Builders
  | "T4 - frontend builder"
  | "D5 - backend builder"
  | "H3 - bulk builder"
  | "F1 - fast builder"
  | "S6 - designer"
  // Specialists
  | "G5 - debugger"
  | "W7 - writer"
  | "M10 - critic"
  | "B3 - router"
  | "O9 - specialist"
  // Growth
  | "Senshi - distributor"
  | "Seichou - growth"
  | "Tsunagi - networker"

export type OverridableAgentName =
  | "build"
  | BuiltinAgentName

export type AgentName = BuiltinAgentName

export type AgentOverrideConfig = Partial<AgentConfig> & {
  prompt_append?: string
  variant?: string
}

export type AgentOverrides = Partial<Record<OverridableAgentName, AgentOverrideConfig>>
