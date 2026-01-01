import type { AgentConfig } from "@opencode-ai/sdk"

export type AgentFactory = (model?: string) => AgentConfig

export function isGptModel(model: string): boolean {
  return model.startsWith("openai/") || model.startsWith("github-copilot/gpt-")
}

export type BuiltinAgentName =
  | "Musashi"
  | "Kenja - advisor"
  | "Shisho - researcher"
  | "Ninja - explorer"
  | "Shokunin - designer"
  | "Daiku - builder"
  | "Takumi - builder"
  | "Hayai - builder"
  | "Tantei - debugger"
  | "Koji - debugger"
  | "Sakka - writer"
  | "Miru - observer"
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
