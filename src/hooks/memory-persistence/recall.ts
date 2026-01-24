import type { RecallResult, RecalledMemory, MemoryPersistenceConfig } from "./types"
import { CONTEXT_TAGS, MIN_SIMILARITY_SCORE } from "./constants"
import { supermemoryClient, getTags, isConfigured } from "../../tools/supermemory/client"
import { log } from "../../shared/logger"

export async function recallMemories(
  sessionId: string,
  directory: string,
  config: MemoryPersistenceConfig
): Promise<RecallResult> {
  const startTime = Date.now()
  const emptyResult: RecallResult = {
    memories: [],
    formattedContext: "",
    timing: 0,
  }

  if (!config.recall_on_start || !isConfigured()) {
    return emptyResult
  }

  try {
    const tags = getTags(directory)
    const memories: RecalledMemory[] = []

    const [userResults, projectResults] = await Promise.all([
      supermemoryClient.searchMemories("recent session context decisions", tags.user),
      supermemoryClient.searchMemories("recent session context decisions", tags.project),
    ])

    if (userResults.results) {
      for (const result of userResults.results) {
        if (result.similarity >= MIN_SIMILARITY_SCORE) {
          memories.push({
            id: result.id,
            content: result.memory || result.chunk || "",
            type: (result.metadata?.type as RecalledMemory["type"]) || "session-context",
            similarity: result.similarity,
            createdAt: result.metadata?.createdAt as string | undefined,
          })
        }
      }
    }

    if (projectResults.results) {
      for (const result of projectResults.results) {
        if (result.similarity >= MIN_SIMILARITY_SCORE) {
          memories.push({
            id: result.id,
            content: result.memory || result.chunk || "",
            type: (result.metadata?.type as RecalledMemory["type"]) || "session-context",
            similarity: result.similarity,
            createdAt: result.metadata?.createdAt as string | undefined,
          })
        }
      }
    }

    memories.sort((a, b) => b.similarity - a.similarity)

    const limitedMemories = memories.slice(0, config.recall_limit)

    const formattedContext = formatMemoriesAsXML(limitedMemories)

    log("[memory-persistence] recalled memories", {
      sessionId,
      count: limitedMemories.length,
      timing: Date.now() - startTime,
    })

    return {
      memories: limitedMemories,
      formattedContext,
      timing: Date.now() - startTime,
    }
  } catch (error) {
    log("[memory-persistence] recall error", { sessionId, error: String(error) })
    return { ...emptyResult, timing: Date.now() - startTime }
  }
}

function formatMemoriesAsXML(memories: RecalledMemory[]): string {
  if (memories.length === 0) {
    return ""
  }

  const { wrapper, memory, type, content, similarity } = CONTEXT_TAGS

  const memoryElements = memories
    .map(
      (m) =>
        `  <${memory}>
    <${type}>${escapeXML(m.type)}</${type}>
    <${content}>${escapeXML(m.content)}</${content}>
    <${similarity}>${m.similarity.toFixed(2)}</${similarity}>
  </${memory}>`
    )
    .join("\n")

  return `<${wrapper}>
${memoryElements}
</${wrapper}>`
}

function escapeXML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
