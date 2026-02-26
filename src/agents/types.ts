import type { AgentConfig } from "@opencode-ai/sdk"

export type AgentMode = "primary" | "subagent" | "all"

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

  /** Skills to auto-load for this agent */
  skills?: string[]
}

function extractModelName(model: string): string {
  return model.includes("/") ? model.split("/").pop() ?? model : model
}

const GPT_MODEL_PREFIXES = ["gpt-", "gpt4", "o1", "o3", "o4"]

export function isGptModel(model: string): boolean {
  if (model.startsWith("openai/") || model.startsWith("github-copilot/gpt-")) return true
  const modelName = extractModelName(model).toLowerCase()
  return GPT_MODEL_PREFIXES.some((prefix) => modelName.startsWith(prefix))
}

const GEMINI_PROVIDERS = ["google/", "google-vertex/"]

export function isGeminiModel(model: string): boolean {
  if (GEMINI_PROVIDERS.some((prefix) => model.startsWith(prefix))) return true
  if (model.startsWith("github-copilot/") && extractModelName(model).toLowerCase().startsWith("gemini")) return true
  const modelName = extractModelName(model).toLowerCase()
  return modelName.startsWith("gemini-")
}

export type BuiltinAgentName =
  | "Musashi"
  | "Musashi - boulder"
  | "Musashi - plan"
  | "K9 - advisor"
  | "X1 - explorer"
  | "R2 - researcher"
  | "T4 - frontend builder"
  | "D5 - backend builder"

export type OverridableAgentName =
  | "build"
  | BuiltinAgentName

export type AgentName = BuiltinAgentName

export type AgentOverrideConfig = Partial<AgentConfig> & {
  prompt_append?: string
  variant?: string
  fallback_models?: string | string[]
}

export type AgentOverrides = Partial<Record<OverridableAgentName, AgentOverrideConfig>>
