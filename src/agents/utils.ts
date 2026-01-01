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
import { createTanteiDebuggerAgent } from "./tantei-debugger"
import { createKojiDebuggerAgent } from "./koji-debugger"
import { createSakkaWriterAgent } from "./sakka-writer"
import { createMiruCriticAgent } from "./miru-observer"
import { createSenshiDistributorAgent } from "./senshi-distributor"
import { createSeichouGrowthAgent } from "./seichou-growth"
import { createTsunagiNetworkerAgent } from "./tsunagi-networker"
import { deepMerge } from "../shared"

type AgentSource = AgentFactory | AgentConfig

const agentSources: Record<BuiltinAgentName, AgentSource> = {
  Musashi: createMusashiAgent,
  "Kenja - advisor": createKenjaAdvisorAgent,
  "Shisho - researcher": createShishoResearcherAgent,
  "Ninja - explorer": createNinjaExplorerAgent,
  "Shokunin - designer": createShokuninDesignerAgent,
  "Daiku - builder": createDaikuBuilderAgent,
  "Takumi - builder": createTakumiBuilderAgent,
  "Hayai - builder": createHayaiBuilderAgent,
  "Tantei - debugger": createTanteiDebuggerAgent,
  "Koji - debugger": createKojiDebuggerAgent,
  "Sakka - writer": createSakkaWriterAgent,
  "Miru - critic": createMiruCriticAgent,
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

    if ((agentName === "Musashi" || agentName === "Shisho - researcher") && directory && config.prompt) {
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
