import type { AgentConfig } from "@opencode-ai/sdk"
import type { AgentPromptMetadata } from "../types"
import { isGeminiModel, isGptModel } from "../types"
import type { AvailableAgent, AvailableSkill, AvailableCategory } from "../dynamic-agent-prompt-builder"
import { buildCategorySkillsDelegationGuide } from "../dynamic-agent-prompt-builder"
import type { CategoryConfig } from "../../config/schema"
import { createAgentToolRestrictions } from "../../shared/permission-compat"
import { mergeCategories } from "../../shared/merge-categories"
import { ORCHESTRATOR_DENIED_TOOL_NAMES } from "../../tools/tool-profiles"

import { getDefaultAtlasPrompt } from "./default"
import { getGptAtlasPrompt } from "./gpt"
import { getGeminiAtlasPrompt } from "./gemini"
import {
  getCategoryDescription,
  buildAgentSelectionSection,
  buildCategorySection,
  buildSkillsSection,
  buildDecisionMatrix,
} from "./prompt-section-builder"

export type AtlasPromptSource = "default" | "gpt" | "gemini"

export interface OrchestratorContext {
  model?: string
  availableAgents?: AvailableAgent[]
  availableSkills?: AvailableSkill[]
  userCategories?: Record<string, CategoryConfig>
}

export function getAtlasPromptSource(model?: string): AtlasPromptSource {
  if (model && isGptModel(model)) return "gpt"
  if (model && isGeminiModel(model)) return "gemini"
  return "default"
}

export function getAtlasPrompt(model?: string): string {
  const source = getAtlasPromptSource(model)
  switch (source) {
    case "gpt":
      return getGptAtlasPrompt()
    case "gemini":
      return getGeminiAtlasPrompt()
    default:
      return getDefaultAtlasPrompt()
  }
}

function buildDynamicOrchestratorPrompt(basePrompt: string, ctx?: OrchestratorContext): string {
  const agents = ctx?.availableAgents ?? []
  const skills = ctx?.availableSkills ?? []
  const userCategories = ctx?.userCategories

  const allCategories = mergeCategories(userCategories)
  const availableCategories: AvailableCategory[] = Object.entries(allCategories).map(([name, config]) => ({
    name,
    description: getCategoryDescription(name, userCategories),
    model: config.model,
  }))

  const skillsSection = buildSkillsSection(skills)
  const categorySection = buildCategorySection(userCategories)
  const agentSection = buildAgentSelectionSection(agents)
  const decisionMatrix = buildDecisionMatrix(agents, userCategories)
  const categorySkillsGuide = buildCategorySkillsDelegationGuide(availableCategories, skills)

  return basePrompt
    .replace("{SKILLS_SECTION}", skillsSection)
    .replace("{CATEGORY_SECTION}", categorySection)
    .replace("{AGENT_SECTION}", agentSection)
    .replace("{DECISION_MATRIX}", decisionMatrix)
    .replace("{{CATEGORY_SKILLS_DELEGATION_GUIDE}}", categorySkillsGuide)
}

export function createAtlasAgent(ctx: OrchestratorContext): AgentConfig {
  if (!ctx.model) {
    throw new Error("createAtlasAgent requires a model in context")
  }
  const restrictions = createAgentToolRestrictions([
    "task",
    "call_omo_agent",
    ...ORCHESTRATOR_DENIED_TOOL_NAMES,
  ])
  return {
    description:
      "Master orchestrator that executes plans via delegate_task(). Skill-first workflow, category routing, TDD enforcement, and independent verification after every delegation.",
    mode: "primary" as const,
    model: ctx.model,
    temperature: 0.1,
    prompt: buildDynamicOrchestratorPrompt(getAtlasPrompt(ctx.model), ctx),
    thinking: { type: "enabled", budgetTokens: 32000 },
    color: "#EF4444",
    ...restrictions,
  } as AgentConfig
}

export const atlasPromptMetadata: AgentPromptMetadata = {
  category: "advisor",
  cost: "EXPENSIVE",
  promptAlias: "Boulder",
  triggers: [
    {
      domain: "Todo list orchestration",
      trigger: "Complete ALL tasks in a todo list with verification",
    },
    {
      domain: "Multi-agent coordination",
      trigger: "Parallel task execution across specialized agents",
    },
  ],
  useWhen: [
    "User provides a todo list path (.musashi/plans/{name}.md)",
    "Multiple tasks need to be completed in sequence or parallel",
    "Work requires coordination across multiple specialized agents",
  ],
  avoidWhen: [
    "Single simple task that doesn't require orchestration",
    "Tasks that can be handled directly by one agent",
    "When user wants to execute tasks manually",
  ],
  keyTrigger:
    "Todo list path provided OR multiple tasks requiring multi-agent orchestration",
}
