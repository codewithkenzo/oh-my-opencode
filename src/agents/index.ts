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
import { miruObserverAgent } from "./miru-observer"
import { g5DebuggerAgent } from "./g5-debugger"
import { w7WriterAgent } from "./w7-writer"
import { f1FastBuilderAgent } from "./f1-fast-builder"
import { o9SpecialistAgent } from "./o9-specialist"
import { seichouGrowthAgent } from "./seichou-growth"
import { senshiDistributorAgent } from "./senshi-distributor"
import { tsunagiNetworkerAgent } from "./tsunagi-networker"

export const builtinAgents: Record<string, AgentConfig> = {
  Musashi: musashiAgent,
  "X1 - explorer": ninjaExplorerAgent,
  "R2 - researcher": shishoResearcherAgent,
  "H3 - bulk builder": hayaiBuilderAgent,
  "T4 - frontend builder": takumiBuilderAgent,
  "D5 - backend builder": daikuBuilderAgent,
  "F1 - fast builder": f1FastBuilderAgent,
  "S6 - designer": shokuninDesignerAgent,
  "G5 - debugger": g5DebuggerAgent,
  "W7 - writer": w7WriterAgent,
  "K9 - advisor": kenjaAdvisorAgent,
  "M10 - critic": miruObserverAgent,
  "B3 - router": b3RouterAgent,
  "O9 - specialist": o9SpecialistAgent,
  "Seichou - growth": seichouGrowthAgent,
  "Senshi - distributor": senshiDistributorAgent,
  "Tsunagi - networker": tsunagiNetworkerAgent,
}

export * from "./types"
export { createBuiltinAgents } from "./utils"
