import type { AgentConfig } from "@opencode-ai/sdk"
import type { BuiltinAgentName, AgentOverrideConfig, AgentOverrides, AgentFactory, AgentPromptMetadata } from "./types"
import type { CategoriesConfig, CategoryConfig, GitMasterConfig } from "../config/schema"
import { createSisyphusAgent } from "./sisyphus"
import { createOracleAgent, ORACLE_PROMPT_METADATA } from "./oracle"
import { createFrontendBuilderAgent, FRONTEND_BUILDER_PROMPT_METADATA } from "./frontend-builder"
import { createBackendBuilderAgent, BACKEND_BUILDER_PROMPT_METADATA } from "./backend-builder"
import { createLibrarianAgent, LIBRARIAN_PROMPT_METADATA } from "./librarian"
import { createExploreAgent, EXPLORE_PROMPT_METADATA } from "./explore"
import { createMetisAgent } from "./metis"
import { createAtlasAgent } from "./atlas"
import { createMomusAgent } from "./momus"
import type { AvailableAgent, AvailableCategory, AvailableSkill } from "./sisyphus-prompt-builder"
import { deepMerge, fetchAvailableModels, resolveModelWithFallback, AGENT_MODEL_REQUIREMENTS, findCaseInsensitive, includesCaseInsensitive } from "../shared"
import { DEFAULT_CATEGORIES, CATEGORY_DESCRIPTIONS } from "../tools/delegate-task/constants"
import { resolveMultipleSkills } from "../features/opencode-skill-loader/skill-content"
import { createBuiltinSkills } from "../features/builtin-skills"
import type { LoadedSkill, SkillScope } from "../features/opencode-skill-loader/types"

export const LEGACY_TO_MUSASHI_NAME: Record<string, BuiltinAgentName> = {
  "sisyphus": "Musashi",
  "Sisyphus": "Musashi",
  "oracle": "K9 - advisor",
  "Oracle": "K9 - advisor",
  "librarian": "R2 - researcher",
  "Librarian": "R2 - researcher",
  "explore": "X1 - explorer",
  "Explore": "X1 - explorer",
  "atlas": "Musashi - boulder",
  "Atlas": "Musashi - boulder",
  "metis": "Musashi - plan",
  "momus": "Musashi - plan",
  "multimodal-looker": "T4 - frontend builder",
  "Sisyphus-Junior": "D5 - backend builder",
  "J1 - junior": "D5 - backend builder",
  "M1 - analyst": "Musashi - plan",
  "M2 - reviewer": "Musashi - plan",
  "V1 - viewer": "T4 - frontend builder",
  "H3 - bulk builder": "D5 - backend builder",
  "F1 - fast builder": "D5 - backend builder",
  "S6 - designer": "T4 - frontend builder",
  "G5 - debugger": "K9 - advisor",
  "W7 - writer": "D5 - backend builder",
  "M10 - critic": "T4 - frontend builder",
  "B3 - security": "K9 - advisor",
  "O9 - specialist": "K9 - advisor",
  "Senshi - distributor": "Musashi",
  "Seichou - growth": "Musashi",
  "Tsunagi - networker": "Musashi",
}

type AgentSource = AgentFactory | AgentConfig

const agentSources: Partial<Record<BuiltinAgentName, AgentSource>> = {
  "Musashi": createSisyphusAgent,
  "Musashi - boulder": createAtlasAgent as unknown as AgentFactory,
  "Musashi - plan": createMetisAgent,  // Prometheus/planning agent
  "K9 - advisor": createOracleAgent,
  "X1 - explorer": createExploreAgent,
  "R2 - researcher": createLibrarianAgent,
  "T4 - frontend builder": createFrontendBuilderAgent,
  "D5 - backend builder": createBackendBuilderAgent,
}

/**
 * Metadata for each agent, used to build Sisyphus's dynamic prompt sections
 * (Delegation Table, Tool Selection, Key Triggers, etc.)
 */
const agentMetadata: Partial<Record<BuiltinAgentName, AgentPromptMetadata>> = {
  "K9 - advisor": ORACLE_PROMPT_METADATA,
  "R2 - researcher": LIBRARIAN_PROMPT_METADATA,
  "X1 - explorer": EXPLORE_PROMPT_METADATA,
  "T4 - frontend builder": FRONTEND_BUILDER_PROMPT_METADATA,
  "D5 - backend builder": BACKEND_BUILDER_PROMPT_METADATA,
}

function isFactory(source: AgentSource): source is AgentFactory {
  return typeof source === "function"
}

export function buildAgent(
  source: AgentSource,
  model: string,
  categories?: CategoriesConfig,
  gitMasterConfig?: GitMasterConfig
): AgentConfig {
  const base = isFactory(source) ? source(model) : source
  const categoryConfigs: Record<string, CategoryConfig> = categories
    ? { ...DEFAULT_CATEGORIES, ...categories }
    : DEFAULT_CATEGORIES

  const agentWithCategory = base as AgentConfig & { category?: string; skills?: string[]; variant?: string }
  if (agentWithCategory.category) {
    const categoryConfig = categoryConfigs[agentWithCategory.category]
    if (categoryConfig) {
      if (!base.model) {
        base.model = categoryConfig.model
      }
      if (base.temperature === undefined && categoryConfig.temperature !== undefined) {
        base.temperature = categoryConfig.temperature
      }
      if (base.variant === undefined && categoryConfig.variant !== undefined) {
        base.variant = categoryConfig.variant
      }
    }
  }

  if (agentWithCategory.skills?.length) {
    const { resolved } = resolveMultipleSkills(agentWithCategory.skills, { gitMasterConfig })
    if (resolved.size > 0) {
      const skillContent = Array.from(resolved.values()).join("\n\n")
      base.prompt = skillContent + (base.prompt ? "\n\n" + base.prompt : "")
    }
  }

  return base
}

/**
 * Creates OmO-specific environment context (time, timezone, locale).
 * Note: Working directory, platform, and date are already provided by OpenCode's system.ts,
 * so we only include fields that OpenCode doesn't provide to avoid duplication.
 * See: https://github.com/code-yeongyu/oh-my-opencode/issues/379
 */
export function createEnvContext(): string {
  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const locale = Intl.DateTimeFormat().resolvedOptions().locale

  const dateStr = now.toLocaleDateString(locale, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const timeStr = now.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

  return `
<omo-env>
  Current date: ${dateStr}
  Current time: ${timeStr}
  Timezone: ${timezone}
  Locale: ${locale}
</omo-env>`
}

function mergeAgentConfig(
  base: AgentConfig,
  override: AgentOverrideConfig
): AgentConfig {
  const { prompt_append, ...rest } = override
  const merged = deepMerge(base, rest as Partial<AgentConfig>)

  if (prompt_append && merged.prompt) {
    merged.prompt = merged.prompt + "\n" + prompt_append
  }

  return merged
}

function mapScopeToLocation(scope: SkillScope): AvailableSkill["location"] {
  if (scope === "user" || scope === "opencode") return "user"
  if (scope === "project" || scope === "opencode-project") return "project"
  return "plugin"
}

export async function createBuiltinAgents(
  disabledAgents: string[] = [],
  agentOverrides: AgentOverrides = {},
  directory?: string,
  systemDefaultModel?: string,
  categories?: CategoriesConfig,
  gitMasterConfig?: GitMasterConfig,
  discoveredSkills: LoadedSkill[] = [],
  client?: any
): Promise<Record<string, AgentConfig>> {
  if (!systemDefaultModel) {
    throw new Error("createBuiltinAgents requires systemDefaultModel")
  }

  // Fetch available models at plugin init
  const availableModels = client ? await fetchAvailableModels(client) : new Set<string>()

  const result: Record<string, AgentConfig> = {}
  const availableAgents: AvailableAgent[] = []

  const mergedCategories = categories
    ? { ...DEFAULT_CATEGORIES, ...categories }
    : DEFAULT_CATEGORIES

  const availableCategories: AvailableCategory[] = Object.entries(mergedCategories).map(([name]) => ({
    name,
    description: categories?.[name]?.description ?? CATEGORY_DESCRIPTIONS[name] ?? "General tasks",
  }))

  const builtinSkills = createBuiltinSkills()
  const builtinSkillNames = new Set(builtinSkills.map(s => s.name))

  const builtinAvailable: AvailableSkill[] = builtinSkills.map((skill) => ({
    name: skill.name,
    description: skill.description,
    location: "plugin" as const,
  }))

  const discoveredAvailable: AvailableSkill[] = discoveredSkills
    .filter(s => !builtinSkillNames.has(s.name))
    .map((skill) => ({
      name: skill.name,
      description: skill.definition.description ?? "",
      location: mapScopeToLocation(skill.scope),
    }))

  const availableSkills: AvailableSkill[] = [...builtinAvailable, ...discoveredAvailable]

   for (const [name, source] of Object.entries(agentSources)) {
     const agentName = name as BuiltinAgentName

     if (agentName === "Musashi") continue
     if (agentName === "Musashi - boulder") continue
     if (includesCaseInsensitive(disabledAgents, agentName)) continue

    // Resolve legacy names to new v4 names for override lookup
    const resolvedLegacyName = LEGACY_TO_MUSASHI_NAME[agentName] ?? agentName
    const override = findCaseInsensitive(agentOverrides, resolvedLegacyName) ?? findCaseInsensitive(agentOverrides, agentName)
    const requirement = AGENT_MODEL_REQUIREMENTS[agentName]
    
    // Use resolver to determine model
    const { model, variant: resolvedVariant } = resolveModelWithFallback({
      userModel: override?.model,
      fallbackChain: requirement?.fallbackChain,
      availableModels,
      systemDefaultModel,
    })

    let config = buildAgent(source, model, mergedCategories, gitMasterConfig)
    
    // Apply variant from override or resolved fallback chain
    if (override?.variant) {
      config = { ...config, variant: override.variant }
    } else if (resolvedVariant) {
      config = { ...config, variant: resolvedVariant }
    }

    if (agentName === "R2 - researcher" && directory && config.prompt) {
      const envContext = createEnvContext()
      config = { ...config, prompt: config.prompt + envContext }
    }

    if (override) {
      config = mergeAgentConfig(config, override)
    }

    result[name] = config

    const metadata = agentMetadata[agentName]
    if (metadata) {
      availableAgents.push({
        name: agentName,
        description: config.description ?? "",
        metadata,
      })
    }
  }

   if (!disabledAgents.includes("Musashi")) {
     const sisyphusOverride = agentOverrides["Musashi"] ?? (agentOverrides as Record<string, AgentOverrideConfig>)["sisyphus"]
     const sisyphusRequirement = AGENT_MODEL_REQUIREMENTS["Musashi"] ?? AGENT_MODEL_REQUIREMENTS["sisyphus"]
    
    // Use resolver to determine model
    const { model: sisyphusModel, variant: sisyphusResolvedVariant } = resolveModelWithFallback({
      userModel: sisyphusOverride?.model,
      fallbackChain: sisyphusRequirement?.fallbackChain,
      availableModels,
      systemDefaultModel,
    })

    let sisyphusConfig = createSisyphusAgent(
      sisyphusModel,
      availableAgents,
      undefined,
      availableSkills,
      availableCategories
    )
    
    // Apply variant from override or resolved fallback chain
    if (sisyphusOverride?.variant) {
      sisyphusConfig = { ...sisyphusConfig, variant: sisyphusOverride.variant }
    } else if (sisyphusResolvedVariant) {
      sisyphusConfig = { ...sisyphusConfig, variant: sisyphusResolvedVariant }
    }

    if (directory && sisyphusConfig.prompt) {
      const envContext = createEnvContext()
      sisyphusConfig = { ...sisyphusConfig, prompt: sisyphusConfig.prompt + envContext }
    }

    if (sisyphusOverride) {
      sisyphusConfig = mergeAgentConfig(sisyphusConfig, sisyphusOverride)
    }

     result["Musashi"] = sisyphusConfig
   }

   if (!disabledAgents.includes("Musashi - boulder")) {
     const orchestratorOverride = agentOverrides["Musashi - boulder"] ?? (agentOverrides as Record<string, AgentOverrideConfig>)["atlas"]
     const atlasRequirement = AGENT_MODEL_REQUIREMENTS["Musashi - boulder"] ?? AGENT_MODEL_REQUIREMENTS["atlas"]
    
    // Use resolver to determine model
    const { model: atlasModel, variant: atlasResolvedVariant } = resolveModelWithFallback({
      userModel: orchestratorOverride?.model,
      fallbackChain: atlasRequirement?.fallbackChain,
      availableModels,
      systemDefaultModel,
    })
    
    let orchestratorConfig = createAtlasAgent({
      model: atlasModel,
      availableAgents,
      availableSkills,
      userCategories: categories,
    })
    
    // Apply variant from override or resolved fallback chain
    if (orchestratorOverride?.variant) {
      orchestratorConfig = { ...orchestratorConfig, variant: orchestratorOverride.variant }
    } else if (atlasResolvedVariant) {
      orchestratorConfig = { ...orchestratorConfig, variant: atlasResolvedVariant }
    }

    if (orchestratorOverride) {
      orchestratorConfig = mergeAgentConfig(orchestratorConfig, orchestratorOverride)
    }

     result["Musashi - boulder"] = orchestratorConfig
   }

   return result
 }
