import { log } from "../../shared/logger"
import {
  isConfigured,
  getTags as getSupermemoryTags,
  supermemoryClient,
} from "../../tools/supermemory"
import { INTEGRATION_TIMEOUT_MS } from "../../tools/supermemory"

export interface SupermemoryIntegration {
  isConfigured: () => boolean
  fetchProjectMemories: (projectTag: string, limit?: number) => Promise<string[]>
  getTags: (directory: string) => { user: string; project: string }
  saveSummary: (content: string, projectTag: string) => Promise<{ id: string } | null>
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Integration timeout after ${ms}ms`)), ms)
    ),
  ])
}

export function getSupermemoryIntegration(): SupermemoryIntegration | null {
  if (!isConfigured()) {
    log("[preemptive-compaction] supermemory not configured, skipping memory injection")
    return null
  }

  log("[preemptive-compaction] supermemory integration loaded (built-in)")

  return {
    isConfigured,

    fetchProjectMemories: async (projectTag: string, limit: number = 10): Promise<string[]> => {
      if (!isConfigured()) return []

      try {
        const result = await withTimeout(
          supermemoryClient.listMemories(projectTag, limit),
          INTEGRATION_TIMEOUT_MS
        )
        const memories = (result.memories || [])
          .map((m) => m.summary || m.content || "")
          .filter(Boolean)

        log("[preemptive-compaction] fetchProjectMemories success", { projectTag, count: memories.length })
        return memories
      } catch (error) {
        log("[preemptive-compaction] fetchProjectMemories error", { error: String(error) })
        return []
      }
    },

    getTags: getSupermemoryTags,

    saveSummary: async (content: string, projectTag: string): Promise<{ id: string } | null> => {
      if (!isConfigured()) return null

      try {
        const result = await withTimeout(
          supermemoryClient.addMemory(
            `[Session Summary]\n${content}`,
            projectTag,
            { type: "conversation" }
          ),
          INTEGRATION_TIMEOUT_MS
        )

        if (result) {
          log("[preemptive-compaction] saveSummary success", { projectTag, id: result.id })
        }
        return result
      } catch (error) {
        log("[preemptive-compaction] saveSummary error", { error: String(error) })
        return null
      }
    },
  }
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
