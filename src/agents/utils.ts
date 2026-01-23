import type { AgentConfig } from "@opencode-ai/sdk"
import type { BuiltinAgentName, AgentOverrideConfig, AgentOverrides, AgentFactory, AgentPromptMetadata } from "./types"
import type { CategoriesConfig, CategoryConfig, GitMasterConfig } from "../config/schema"
import { createSisyphusAgent } from "./sisyphus"
import { createOracleAgent, ORACLE_PROMPT_METADATA } from "./oracle"
import { createLibrarianAgent, LIBRARIAN_PROMPT_METADATA } from "./librarian"
import { createExploreAgent, EXPLORE_PROMPT_METADATA } from "./explore"
import { createFrontendUiUxEngineerAgent, FRONTEND_PROMPT_METADATA } from "./frontend-ui-ux-engineer"
import { createDocumentWriterAgent, DOCUMENT_WRITER_PROMPT_METADATA } from "./document-writer"
import { createMultimodalLookerAgent, MULTIMODAL_LOOKER_PROMPT_METADATA } from "./multimodal-looker"
import { createMetisAgent } from "./metis"
import { createOrchestratorSisyphusAgent } from "./orchestrator-sisyphus"
import { createMomusAgent } from "./momus"
import { createSisyphusJuniorAgentWithOverrides } from "./sisyphus-junior"
import { createTakumiBuilderAgent } from "./takumi-builder"
import { createDaikuBuilderAgent } from "./builder"
import { createHayaiBuilderAgent } from "./hayai-builder"
import { createF1FastBuilderAgent } from "./f1-fast-builder"
import { createShokuninDesignerAgent } from "./shokunin-designer"
import { createG5DebuggerAgent } from "./g5-debugger"
import { createW7WriterAgent } from "./w7-writer"
import { createKenjaAdvisorAgent } from "./kenja-advisor"
import { createMiruCriticAgent } from "./m10-critic"
import { createB3SecurityAgent } from "./b3-security"
import { createO9SpecialistAgent } from "./o9-specialist"
import { createSenshiDistributorAgent } from "./senshi-distributor"
import { createSeichouGrowthAgent } from "./seichou-growth"
import { createTsunagiNetworkerAgent } from "./tsunagi-networker"
import type { AvailableAgent } from "./sisyphus-prompt-builder"
import { deepMerge } from "../shared"
import { DEFAULT_CATEGORIES } from "../tools/delegate-task/constants"
import { resolveMultipleSkills } from "../features/opencode-skill-loader/skill-content"

type AgentSource = AgentFactory | AgentConfig

/**
 * Maps legacy agent names to Musashi-style names.
 * Used to support backward compatibility in disabled_agents config.
 */
const LEGACY_TO_MUSASHI_NAME: Record<string, BuiltinAgentName> = {
  // Legacy → Musashi
  "Sisyphus": "Musashi",
  "orchestrator-sisyphus": "Musashi - boulder",
  "Prometheus (Planner)": "Musashi - plan",
  "explore": "X1 - explorer",
  "librarian": "R2 - researcher",
  "oracle": "K9 - advisor",
  "frontend-ui-ux-engineer": "T4 - frontend builder",
  "document-writer": "W7 - writer",
  "multimodal-looker": "V1 - viewer",
}

/**
 * Normalizes agent names to Musashi-style.
 * Accepts both legacy and new names, returns Musashi name.
 */
export function normalizeAgentName(name: string): BuiltinAgentName {
  return (LEGACY_TO_MUSASHI_NAME[name] ?? name) as BuiltinAgentName
}

/**
 * Normalizes an array of agent names (legacy or new) to Musashi-style.
 */
export function normalizeAgentNames(names: string[]): BuiltinAgentName[] {
  return names.map(normalizeAgentName)
}

const agentSources: Record<BuiltinAgentName, AgentSource> = {
  // Orchestration
  "Musashi": createSisyphusAgent,
  "Musashi - boulder": createOrchestratorSisyphusAgent as unknown as AgentFactory,
  "Musashi - plan": null as unknown as AgentFactory, // Handled by config-handler.ts
  // Validation
  "M1 - analyst": createMetisAgent,
  "M2 - reviewer": createMomusAgent,
  // Execution
  "J1 - junior": createSisyphusJuniorAgentWithOverrides as unknown as AgentFactory,
  "K9 - advisor": createKenjaAdvisorAgent,
  // Explorers
  "X1 - explorer": createExploreAgent,
  "R2 - researcher": createLibrarianAgent,
  "V1 - viewer": createMultimodalLookerAgent,
  // Builders
  "T4 - frontend builder": createTakumiBuilderAgent,
  "D5 - backend builder": createDaikuBuilderAgent,
  "H3 - bulk builder": createHayaiBuilderAgent,
  "F1 - fast builder": createF1FastBuilderAgent,
  "S6 - designer": createShokuninDesignerAgent,
  // Specialists
  "G5 - debugger": createG5DebuggerAgent,
  "W7 - writer": createW7WriterAgent,
  "M10 - critic": createMiruCriticAgent,
  "B3 - security": createB3SecurityAgent,
  "O9 - specialist": createO9SpecialistAgent,
  // Growth
  "Senshi - distributor": createSenshiDistributorAgent,
  "Seichou - growth": createSeichouGrowthAgent,
  "Tsunagi - networker": createTsunagiNetworkerAgent,
}

/**
 * Metadata for each agent, used to build Musashi's dynamic prompt sections
 * (Delegation Table, Tool Selection, Key Triggers, etc.)
 */
const agentMetadata: Partial<Record<BuiltinAgentName, AgentPromptMetadata>> = {
  // Orchestration
  "Musashi - boulder": {
    category: "advisor",
    cost: "EXPENSIVE",
    triggers: [],
    skills: ["git-workflow", "test-driven-development", "verification-before-completion"],
  },
  // Validation
  "M1 - analyst": {
    category: "specialist",
    cost: "CHEAP",
    triggers: [{ domain: "Planning", trigger: "Pre-planning analysis needed" }],
    skills: ["intent-critique", "problem-solving"],
  },
  "M2 - reviewer": {
    category: "specialist",
    cost: "CHEAP",
    triggers: [{ domain: "Planning", trigger: "Plan validation needed" }],
    skills: ["code-review-excellence", "frontend-code-review"],
  },
  // Explorers
  "X1 - explorer": EXPLORE_PROMPT_METADATA,
  "R2 - researcher": LIBRARIAN_PROMPT_METADATA,
  "V1 - viewer": MULTIMODAL_LOOKER_PROMPT_METADATA,
  // Builders
  "T4 - frontend builder": {
    ...FRONTEND_PROMPT_METADATA,
    skills: ["frontend-stack", "component-stack", "motion-system", "tailwind-design-system"],
  },
  "D5 - backend builder": {
    category: "specialist",
    cost: "CHEAP",
    triggers: [{ domain: "Backend Development", trigger: "API routes, database, server-side logic" }],
    skills: ["bun-hono-api", "hono-api", "elysiajs", "drizzle-sqlite", "better-auth", "effect-ts-expert"],
  },
  "H3 - bulk builder": {
    category: "utility",
    cost: "CHEAP",
    triggers: [{ domain: "Bulk Editing", trigger: "Multiple files, large refactors" }],
  },
  "F1 - fast builder": {
    category: "utility",
    cost: "CHEAP",
    triggers: [{ domain: "Scaffolding", trigger: "Fast code generation" }],
  },
  "S6 - designer": {
    category: "advisor",
    cost: "CHEAP",
    triggers: [{ domain: "Design", trigger: "Design systems, visual hierarchy, color palettes" }],
    skills: ["ui-designer", "design-system-patterns", "color-palette", "visual-design-foundations"],
  },
  // Specialists
  "G5 - debugger": {
    category: "specialist",
    cost: "CHEAP",
    triggers: [{ domain: "Debugging", trigger: "Bugs, errors, crashes, unexpected behavior" }],
    skills: ["systematic-debugging", "backend-debugging", "visual-debug", "memory-leak-detection"],
  },
  "W7 - writer": {
    ...DOCUMENT_WRITER_PROMPT_METADATA,
    skills: ["crafting-effective-readmes", "writing-clearly-and-concisely", "api-documentation-generator"],
  },
  "M10 - critic": {
    category: "specialist",
    cost: "CHEAP",
    triggers: [{ domain: "Visual Review", trigger: "UI/UX feedback, accessibility, visual bugs" }],
  },
  "B3 - security": {
    category: "specialist",
    cost: "CHEAP",
    triggers: [{ domain: "Security", trigger: "Vulnerability assessment, code review, OWASP compliance" }],
    skills: ["owasp-security", "api-security-best-practices", "vulnerability-scanning", "auth-implementation-patterns"],
  },
  "O9 - specialist": {
    category: "specialist",
    cost: "EXPENSIVE",
    triggers: [{ domain: "Complex Problems", trigger: "Hard problems requiring Opus" }],
  },
  // Growth
  "Senshi - distributor": {
    category: "utility",
    cost: "CHEAP",
    triggers: [{ domain: "Distribution", trigger: "Product launch, release orchestration" }],
  },
  "Seichou - growth": {
    category: "utility",
    cost: "CHEAP",
    triggers: [{ domain: "Growth", trigger: "Social media, content strategy, marketing" }],
  },
  "Tsunagi - networker": {
    category: "utility",
    cost: "CHEAP",
    triggers: [{ domain: "Networking", trigger: "Community building, partnerships" }],
  },
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
 * See: https://github.com/codewithkenzo/oh-my-opencode/issues/379
 */
export function createEnvContext(): string {
  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const locale = Intl.DateTimeFormat().resolvedOptions().locale

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

  return `
<omo-env>
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

export function createBuiltinAgents(
  disabledAgents: BuiltinAgentName[] = [],
  agentOverrides: AgentOverrides = {},
  directory?: string,
  systemDefaultModel?: string,
  categories?: CategoriesConfig,
  gitMasterConfig?: GitMasterConfig
): Record<string, AgentConfig> {
  if (!systemDefaultModel) {
    throw new Error("createBuiltinAgents requires systemDefaultModel")
  }

  const result: Record<string, AgentConfig> = {}
  const availableAgents: AvailableAgent[] = []

  const mergedCategories = categories
    ? { ...DEFAULT_CATEGORIES, ...categories }
    : DEFAULT_CATEGORIES

  const normalizedDisabled = normalizeAgentNames(disabledAgents)

  for (const [name, source] of Object.entries(agentSources)) {
    const agentName = name as BuiltinAgentName

    if (agentName === "Musashi") continue
    if (agentName === "Musashi - boulder") continue
    if (agentName === "Musashi - plan") continue
    if (normalizedDisabled.includes(agentName)) continue
    if (!source) continue // Skip null placeholders

    const override = agentOverrides[agentName]
    const model = override?.model ?? systemDefaultModel
    const metadata = agentMetadata[agentName]

    let config = buildAgent(source, model, mergedCategories, gitMasterConfig)

    if (metadata?.skills?.length && !("skills" in config)) {
      const configWithSkills = config as AgentConfig & { skills?: string[] }
      configWithSkills.skills = metadata.skills.slice(0, 5)
      const { resolved } = resolveMultipleSkills(configWithSkills.skills, { gitMasterConfig })
      if (resolved.size > 0) {
        const skillContent = Array.from(resolved.values()).join("\n\n")
        config.prompt = skillContent + (config.prompt ? "\n\n" + config.prompt : "")
      }
    }

    if (agentName === "R2 - researcher" && directory && config.prompt) {
      const envContext = createEnvContext()
      config = { ...config, prompt: config.prompt + envContext }
    }

    if (override) {
      config = mergeAgentConfig(config, override)
    }

    result[name] = config

    if (metadata) {
      availableAgents.push({
        name: agentName,
        description: config.description ?? "",
        metadata,
      })
    }
  }

  if (!normalizedDisabled.includes("Musashi")) {
    const sisyphusOverride = agentOverrides["Musashi"]
    const sisyphusModel = sisyphusOverride?.model ?? systemDefaultModel

    let sisyphusConfig = createSisyphusAgent(sisyphusModel, availableAgents)

    if (directory && sisyphusConfig.prompt) {
      const envContext = createEnvContext()
      sisyphusConfig = { ...sisyphusConfig, prompt: sisyphusConfig.prompt + envContext }
    }

    if (sisyphusOverride) {
      sisyphusConfig = mergeAgentConfig(sisyphusConfig, sisyphusOverride)
    }

    result["Musashi"] = sisyphusConfig
  }

  if (!normalizedDisabled.includes("Musashi - boulder")) {
    const orchestratorOverride = agentOverrides["Musashi - boulder"]
    const orchestratorModel = orchestratorOverride?.model ?? systemDefaultModel
    let orchestratorConfig = createOrchestratorSisyphusAgent({
      model: orchestratorModel,
      availableAgents,
    })

    const boulderMetadata = agentMetadata["Musashi - boulder"]
    if (boulderMetadata?.skills?.length) {
      const { resolved } = resolveMultipleSkills(boulderMetadata.skills.slice(0, 5), { gitMasterConfig })
      if (resolved.size > 0) {
        const skillContent = Array.from(resolved.values()).join("\n\n")
        orchestratorConfig.prompt = skillContent + (orchestratorConfig.prompt ? "\n\n" + orchestratorConfig.prompt : "")
      }
    }

    if (orchestratorOverride) {
      orchestratorConfig = mergeAgentConfig(orchestratorConfig, orchestratorOverride)
    }

    result["Musashi - boulder"] = orchestratorConfig
  }

  return result
}
