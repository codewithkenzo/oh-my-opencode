import type { AgentConfig } from "@opencode-ai/sdk"

export type AgentFactory = (model?: string) => AgentConfig

export function isGptModel(model: string): boolean {
  return model.startsWith("openai/") || model.startsWith("github-copilot/gpt-")
}

export type BuiltinAgentName =
  // Core orchestrator
  | "Musashi"
  // Robot-coded agents
  | "X1 - explorer"
  | "R2 - researcher"
  | "H3 - bulk builder"
  | "T4 - frontend builder"
  | "D5 - backend builder"
  | "F1 - fast builder"
  | "S6 - designer"
  | "G5 - debugger"
  | "W7 - writer"
  | "K9 - advisor"
  | "M10 - critic"
  | "B3 - router"
  | "O9 - specialist"
  // Marketing agents (keep Japanese)
  | "Senshi - distributor"
  | "Seichou - growth"
  | "Tsunagi - networker"

export type OverridableAgentName =
  | "build"
  | BuiltinAgentName

export type AgentName = BuiltinAgentName

export type AgentOverrideConfig = Partial<AgentConfig> & {
  prompt_append?: string
}

export type AgentOverrides = Partial<Record<OverridableAgentName, AgentOverrideConfig>>
