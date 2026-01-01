import { log } from "../../shared/logger"

interface SupermemoryIntegration {
  isConfigured: () => boolean
  fetchProjectMemories: (projectTag: string, limit?: number) => Promise<string[]>
  getTags: (directory: string) => { user: string; project: string }
  saveSummary: (content: string, projectTag: string) => Promise<{ id: string } | null>
}

let integration: SupermemoryIntegration | null = null
let loadAttempted = false

export async function getSupermemoryIntegration(): Promise<SupermemoryIntegration | null> {
  if (loadAttempted) return integration
  loadAttempted = true

  try {
    // @ts-expect-error optional peer dependency
    const module = await import("opencode-supermemory")
    if (typeof module.getSupermemoryAPI === "function") {
      integration = module.getSupermemoryAPI()
      log("[preemptive-compaction] supermemory integration loaded")
    }
  } catch {
    log("[preemptive-compaction] supermemory not available, skipping memory injection")
  }

  return integration
}

export function createMemoryInjectionPrompt(projectMemories: string[]): string {
  if (projectMemories.length === 0) return ""

  return `[COMPACTION CONTEXT - PROJECT MEMORY]

When summarizing this session, preserve the following project knowledge:

## Project Knowledge (from Supermemory)
${projectMemories.map(m => `- ${m}`).join('\n')}

This context is critical for maintaining continuity after compaction.
`
}
