import type { AgentConfig } from "@opencode-ai/sdk"
import type { BuiltinAgentName, AgentOverrideConfig, AgentOverrides, AgentFactory } from "./types"
import { createMusashiAgent } from "./musashi"
import { createKenjaAdvisorAgent } from "./kenja-advisor"
import { createShishoResearcherAgent } from "./shisho-researcher"
import { createNinjaExplorerAgent } from "./ninja-explorer"
import { createShokuninDesignerAgent } from "./shokunin-designer"
import { createDaikuBuilderAgent } from "./builder"
import { createTakumiBuilderAgent } from "./takumi-builder"
import { createHayaiBuilderAgent } from "./hayai-builder"
import { createMiruCriticAgent } from "./miru-observer"
import { createSenshiDistributorAgent } from "./senshi-distributor"
import { createSeichouGrowthAgent } from "./seichou-growth"
import { createTsunagiNetworkerAgent } from "./tsunagi-networker"
import { createG5DebuggerAgent } from "./g5-debugger"
import { createW7WriterAgent } from "./w7-writer"
import { createB3RouterAgent } from "./b3-router"
import { createF1FastBuilderAgent } from "./f1-fast-builder"
import { createO9SpecialistAgent } from "./o9-specialist"
import { deepMerge } from "../shared"

type AgentSource = AgentFactory | AgentConfig

// Robot code naming: Letter + Number + Role
// X1 = eXplorer, R2 = Researcher, H3 = bulk (Hayai), T4 = fronTend, D5 = backenD
// F1 = Fast, S6 = deSigner, G5 = debuGger (merged), W7 = Writer (merged)
// K9 = advisor (Kenja), M10 = critic (Miru), B3 = router, O9 = specialist (Opus)
const agentSources: Record<BuiltinAgentName, AgentSource> = {
  // Core orchestrator
  Musashi: createMusashiAgent,

  // Robot-coded agents
  "X1 - explorer": createNinjaExplorerAgent,
  "R2 - researcher": createShishoResearcherAgent,
  "H3 - bulk builder": createHayaiBuilderAgent,
  "T4 - frontend builder": createTakumiBuilderAgent,
  "D5 - backend builder": createDaikuBuilderAgent,
  "F1 - fast builder": createF1FastBuilderAgent,
  "S6 - designer": createShokuninDesignerAgent,
  "G5 - debugger": createG5DebuggerAgent,
  "W7 - writer": createW7WriterAgent,
  "K9 - advisor": createKenjaAdvisorAgent,
  "M10 - critic": createMiruCriticAgent,
  "B3 - router": createB3RouterAgent,
  "O9 - specialist": createO9SpecialistAgent,

  // Marketing agents (keep Japanese names)
  "Senshi - distributor": createSenshiDistributorAgent,
  "Seichou - growth": createSeichouGrowthAgent,
  "Tsunagi - networker": createTsunagiNetworkerAgent,
}

function isFactory(source: AgentSource): source is AgentFactory {
  return typeof source === "function"
}

function buildAgent(source: AgentSource, model?: string): AgentConfig {
  return isFactory(source) ? source(model) : source
}

export function createEnvContext(directory: string): string {
  const now = new Date()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const locale = Intl.DateTimeFormat().resolvedOptions().locale

  const dateStr = now.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })

  const platform = process.platform as "darwin" | "linux" | "win32" | string

  return `
Here is some useful information about the environment you are running in:
<env>
  Working directory: ${directory}
  Platform: ${platform}
  Today's date: ${dateStr} (NOT 2024, NEVEREVER 2024)
  Current time: ${timeStr}
  Timezone: ${timezone}
  Locale: ${locale}
</env>`
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
  disabledAgents: string[] = [],
  agentOverrides: AgentOverrides = {},
  directory?: string,
  systemDefaultModel?: string
): Record<string, AgentConfig> {
  const result: Record<string, AgentConfig> = {}

  for (const [name, source] of Object.entries(agentSources)) {
    const agentName = name as BuiltinAgentName

    if (disabledAgents.includes(name)) {
      continue
    }

    const override = agentOverrides[agentName]
    const model = override?.model ?? (agentName === "Musashi" ? systemDefaultModel : undefined)

    let config = buildAgent(source, model)

    // Inject env context for orchestrator and researcher
    if ((agentName === "Musashi" || agentName === "R2 - researcher") && directory && config.prompt) {
      const envContext = createEnvContext(directory)
      config = { ...config, prompt: config.prompt + envContext }
    }

    if (override) {
      config = mergeAgentConfig(config, override)
    }

    result[name] = config
  }

  return result
}
