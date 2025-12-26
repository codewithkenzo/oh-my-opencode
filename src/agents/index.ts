import type { AgentConfig } from "@opencode-ai/sdk"
import { musashiAgent } from "./musashi"
import { kenjaAdvisorAgent } from "./kenja-advisor"
import { shishoResearcherAgent } from "./shisho-researcher"
import { ninjaExplorerAgent } from "./ninja-explorer"
import { shokuninDesignerAgent } from "./shokunin-designer"
import { takumiBuilderAgent } from "./takumi-builder"
import { hayaiBuilderAgent } from "./hayai-builder"
import { tanteiDebuggerAgent } from "./tantei-debugger"
import { sakkaWriterAgent } from "./sakka-writer"
import { miruObserverAgent } from "./miru-observer"

export const builtinAgents: Record<string, AgentConfig> = {
  Musashi: musashiAgent,
  "Kenja - advisor": kenjaAdvisorAgent,
  "Shisho - researcher": shishoResearcherAgent,
  "Ninja - explorer": ninjaExplorerAgent,
  "Shokunin - designer": shokuninDesignerAgent,
  "Takumi - builder": takumiBuilderAgent,
  "Hayai - builder": hayaiBuilderAgent,
  "Tantei - debugger": tanteiDebuggerAgent,
  "Sakka - writer": sakkaWriterAgent,
  "Miru - observer": miruObserverAgent,
}

export * from "./types"
export { createBuiltinAgents } from "./utils"
