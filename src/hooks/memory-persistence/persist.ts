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
      const lower = trimmed.toLowerCase()

      // Match decision patterns: "- Decision:", "decided to", "chose to", "will use"
      if (trimmed.startsWith("- Decision:") || lower.includes("decided to") || lower.includes("chose to") || lower.includes("will use")) {
        decisions.push(trimmed)
      }
      // Match blocker patterns: "- Blocker:", "blocked by", "waiting on", "depends on"
      else if (trimmed.startsWith("- Blocker:") || lower.includes("blocked by") || lower.includes("waiting on") || lower.includes("depends on")) {
        blockers.push(trimmed)
      }
      // Match next step patterns: "- Next:", "next step", "todo:", "remaining:", "will need to"
      else if (trimmed.startsWith("- Next:") || lower.includes("next step") || lower.startsWith("todo:") || lower.startsWith("remaining:") || lower.includes("will need to")) {
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
