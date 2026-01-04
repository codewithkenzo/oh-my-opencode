import type { AgentConfig } from "@opencode-ai/sdk"
import { musashiAgent } from "./musashi"
import { b3RouterAgent } from "./b3-router"
import { kenjaAdvisorAgent } from "./kenja-advisor"
import { shishoResearcherAgent } from "./shisho-researcher"
import { ninjaExplorerAgent } from "./ninja-explorer"
import { shokuninDesignerAgent } from "./shokunin-designer"
import { takumiBuilderAgent } from "./takumi-builder"
import { daikuBuilderAgent } from "./builder"
import { hayaiBuilderAgent } from "./hayai-builder"
import { tanteiDebuggerAgent } from "./tantei-debugger"
import { kojiDebuggerAgent } from "./koji-debugger"
import { sakkaWriterAgent } from "./sakka-writer"
import { miruObserverAgent } from "./miru-observer"
import { bunshiWriterAgent } from "./bunshi-writer"
import { seichouGrowthAgent } from "./seichou-growth"
import { senshiDistributorAgent } from "./senshi-distributor"
import { tsunagiNetworkerAgent } from "./tsunagi-networker"

export const builtinAgents: Record<string, AgentConfig> = {
  Musashi: musashiAgent,
  "B3 - router": b3RouterAgent,
  "Kenja - advisor": kenjaAdvisorAgent,
  "Shisho - researcher": shishoResearcherAgent,
  "Ninja - explorer": ninjaExplorerAgent,
  "Shokunin - designer": shokuninDesignerAgent,
  "Takumi - builder": takumiBuilderAgent,
  "Daiku - builder": daikuBuilderAgent,
  "Hayai - builder": hayaiBuilderAgent,
  "Tantei - debugger": tanteiDebuggerAgent,
  "Koji - debugger": kojiDebuggerAgent,
  "Sakka - writer": sakkaWriterAgent,
  "Miru - critic": miruObserverAgent,
  "Bunshi - writer": bunshiWriterAgent,
  "Seichou - growth": seichouGrowthAgent,
  "Senshi - distributor": senshiDistributorAgent,
  "Tsunagi - networker": tsunagiNetworkerAgent,
}

export * from "./types"
export { createBuiltinAgents } from "./utils"
