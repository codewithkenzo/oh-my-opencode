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
    const seenIds = new Set<string>()
    const memories: RecalledMemory[] = []

    const searchQuery = "session context decisions patterns preferences errors solutions"

    const [userResults, projectResults] = await Promise.all([
      supermemoryClient.searchMemories(searchQuery, tags.user),
      supermemoryClient.searchMemories(searchQuery, tags.project),
    ])

    const addMemory = (result: typeof userResults.results extends (infer T)[] | undefined ? T : never) => {
      if (!result || result.similarity < MIN_SIMILARITY_SCORE) return
      if (seenIds.has(result.id)) return
      seenIds.add(result.id)
      memories.push({
        id: result.id,
        content: result.memory || result.chunk || "",
        type: (result.metadata?.type as RecalledMemory["type"]) || "session-context",
        similarity: result.similarity,
        createdAt: result.metadata?.createdAt as string | undefined,
      })
    }

    userResults.results?.forEach(addMemory)
    projectResults.results?.forEach(addMemory)

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
