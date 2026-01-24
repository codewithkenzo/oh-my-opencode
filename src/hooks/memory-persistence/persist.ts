import type { SessionState, MemoryPersistenceConfig } from "./types"
import { MAX_MEMORY_CONTENT_LENGTH } from "./constants"
import { supermemoryClient, getProjectTag, stripPrivateContent, isConfigured } from "../../tools/supermemory/client"
import { log } from "../../shared/logger"

export async function persistSessionState(
  sessionId: string,
  directory: string,
  config: MemoryPersistenceConfig,
  summary?: string
): Promise<boolean> {
  if (!config.persist_on_compact || !isConfigured()) {
    return false
  }

  try {
    const state = buildSessionState(sessionId, summary)
    const content = formatStateForStorage(state)

    if (!content || content.length < 50) {
      log("[memory-persistence] skip persist - content too short", { sessionId })
      return false
    }

    const sanitizedContent = stripPrivateContent(content)
    if (sanitizedContent.trim() === "[REDACTED]" || sanitizedContent.length < 50) {
      log("[memory-persistence] skip persist - fully redacted", { sessionId })
      return false
    }

    const truncatedContent = sanitizedContent.slice(0, MAX_MEMORY_CONTENT_LENGTH)
    const projectTag = getProjectTag(directory)

    const result = await supermemoryClient.addMemory(truncatedContent, projectTag, {
      type: "conversation",
      sessionId,
      timestamp: state.timestamp,
      memoryType: "session-context",
    })

    if (result?.id) {
      log("[memory-persistence] persisted session state", { sessionId, memoryId: result.id })
      return true
    }

    return false
  } catch (error) {
    log("[memory-persistence] persist error", { sessionId, error: String(error) })
    return false
  }
}

function buildSessionState(sessionId: string, summary?: string): SessionState {
  const decisions: string[] = []
  const blockers: string[] = []
  const nextSteps: string[] = []

  if (summary) {
    const lines = summary.split("\n")
    for (const line of lines) {
      const trimmed = line.trim()
      if (trimmed.startsWith("- Decision:") || trimmed.includes("decided to")) {
        decisions.push(trimmed)
      } else if (trimmed.startsWith("- Blocker:") || trimmed.includes("blocked by")) {
        blockers.push(trimmed)
      } else if (trimmed.startsWith("- Next:") || trimmed.includes("next step")) {
        nextSteps.push(trimmed)
      }
    }
  }

  return {
    currentWork: summary || "",
    decisions,
    blockers,
    nextSteps,
    timestamp: new Date().toISOString(),
    sessionId,
  }
}

function formatStateForStorage(state: SessionState): string {
  const parts: string[] = []

  parts.push(`Session: ${state.sessionId}`)
  parts.push(`Time: ${state.timestamp}`)

  if (state.currentWork) {
    parts.push(`\nWork Summary:\n${state.currentWork}`)
  }

  if (state.decisions.length > 0) {
    parts.push(`\nDecisions:\n${state.decisions.join("\n")}`)
  }

  if (state.blockers.length > 0) {
    parts.push(`\nBlockers:\n${state.blockers.join("\n")}`)
  }

  if (state.nextSteps.length > 0) {
    parts.push(`\nNext Steps:\n${state.nextSteps.join("\n")}`)
  }

  return parts.join("\n")
}
