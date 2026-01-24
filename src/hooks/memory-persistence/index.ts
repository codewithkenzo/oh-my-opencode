import type { PluginInput } from "@opencode-ai/plugin"
import type { MemoryPersistenceConfig } from "./types"
import { DEFAULT_MEMORY_CONFIG } from "./constants"
import { recallMemories } from "./recall"
import { persistSessionState } from "./persist"
import { extractPatterns } from "./extract"
import { isConfigured } from "../../tools/supermemory/client"
import { log } from "../../shared/logger"
import type { ContextCollector } from "../../features/context-injector"

export { HOOK_NAME, DEFAULT_MEMORY_CONFIG } from "./constants"
export type { MemoryPersistenceConfig } from "./types"

interface SessionInfo {
  id?: string
  parentID?: string
}

interface MessageInfo {
  role?: string
  content?: string
  id?: string
}

export interface MemoryPersistenceHookOptions {
  config?: Partial<MemoryPersistenceConfig>
  contextCollector?: ContextCollector
}

export interface MemoryPersistenceHook {
  event: (input: { event: { type: string; properties?: unknown } }) => Promise<void>
  onSummarize?: (ctx: { sessionID: string; directory: string; summary?: string }) => Promise<void>
}

export function createMemoryPersistenceHook(
  ctx: PluginInput,
  options?: MemoryPersistenceHookOptions
): MemoryPersistenceHook {
  const config: MemoryPersistenceConfig = {
    ...DEFAULT_MEMORY_CONFIG,
    ...options?.config,
  }

  const contextCollector = options?.contextCollector
  const processedSessions = new Set<string>()
  const processingInProgress = new Set<string>()
  // Store messages by ID to dedupe streaming updates (message.updated fires per-token)
  const sessionMessages = new Map<string, Map<string, { role: string; content: string }>>()
  // Counter for fallback key generation when messageID is not available
  const sessionMessageCounters = new Map<string, number>()
  const MAX_MESSAGES_PER_SESSION = 100

  async function handleSessionCreated(sessionInfo: SessionInfo): Promise<void> {
    if (!config.enabled || !config.recall_on_start) return
    if (!sessionInfo.id) return
    if (sessionInfo.parentID) {
      log("[memory-persistence] skip recall for child session", { sessionId: sessionInfo.id })
      return
    }
    if (processedSessions.has(sessionInfo.id)) return
    if (processingInProgress.has(sessionInfo.id)) return

    if (!isConfigured()) {
      log("[memory-persistence] supermemory not configured, skip recall")
      return
    }

    processingInProgress.add(sessionInfo.id)

    try {
      const result = await recallMemories(sessionInfo.id, ctx.directory, config)

      if (result.formattedContext && contextCollector) {
        contextCollector.register(sessionInfo.id, {
          id: "memory-persistence-recall",
          content: result.formattedContext,
          source: "custom",
          priority: "normal",
        })
        log("[memory-persistence] injected recalled memories", {
          sessionId: sessionInfo.id,
          memoryCount: result.memories.length,
        })
      }
    } catch (error) {
      log("[memory-persistence] recall failed", { sessionId: sessionInfo.id, error: String(error) })
    } finally {
      processingInProgress.delete(sessionInfo.id)
      processedSessions.add(sessionInfo.id)
    }
  }

  async function handleSessionIdle(sessionId: string): Promise<void> {
    if (!config.enabled || !config.extract_patterns) return
    if (!isConfigured()) return

    const messageMap = sessionMessages.get(sessionId)
    if (!messageMap || messageMap.size < config.min_session_length) {
      log("[memory-persistence] skip extraction - insufficient messages", {
        sessionId,
        count: messageMap?.size || 0,
      })
      return
    }

    // Convert map to array for extraction
    const messages = Array.from(messageMap.values())

    try {
      const result = await extractPatterns(sessionId, ctx.directory, config, messages)
      log("[memory-persistence] extraction complete", {
        sessionId,
        detected: result.patterns.length,
        stored: result.storedCount,
      })
    } catch (error) {
      log("[memory-persistence] extraction failed", { sessionId, error: String(error) })
    } finally {
      // Clear messages after extraction to prevent memory bloat on long-running sessions
      sessionMessages.delete(sessionId)
    }
  }

  function handleMessageUpdated(info: MessageInfo & { sessionID?: string }): void {
    if (!info.sessionID || !info.role || !info.content) return

    let messageMap = sessionMessages.get(info.sessionID)
    if (!messageMap) {
      messageMap = new Map()
      sessionMessages.set(info.sessionID, messageMap)
    }

    // Use message.id to dedupe streaming updates (message.updated fires per-token)
    // If no id, use stable counter-based key (role + sequential number)
    let key = info.id
    if (!key) {
      const counter = sessionMessageCounters.get(info.sessionID) || 0
      key = `${info.role}:${counter}`
      // Only increment counter for new messages (check if key exists and content differs)
      if (!messageMap.has(key) || messageMap.get(key)?.content !== info.content) {
        sessionMessageCounters.set(info.sessionID, counter + 1)
      }
    }
    messageMap.set(key, { role: info.role, content: info.content })

    // Enforce max messages by removing oldest entries
    if (messageMap.size > MAX_MESSAGES_PER_SESSION) {
      const keysToDelete = Array.from(messageMap.keys()).slice(0, messageMap.size - MAX_MESSAGES_PER_SESSION)
      for (const k of keysToDelete) {
        messageMap.delete(k)
      }
    }
  }

  function handleSessionDeleted(sessionId: string): void {
    processedSessions.delete(sessionId)
    sessionMessages.delete(sessionId)
    sessionMessageCounters.delete(sessionId)
  }

  const eventHandler = async (input: { event: { type: string; properties?: unknown } }): Promise<void> => {
    const { event } = input
    const props = event.properties as Record<string, unknown> | undefined

    if (event.type === "session.created") {
      const sessionInfo = props?.info as SessionInfo | undefined
      if (sessionInfo) {
        await handleSessionCreated(sessionInfo)
      }
    }

    if (event.type === "session.idle") {
      const sessionId = props?.sessionID as string | undefined
      if (sessionId) {
        await handleSessionIdle(sessionId)
      }
    }

    if (event.type === "message.updated") {
      const info = props?.info as (MessageInfo & { sessionID?: string }) | undefined
      if (info) {
        handleMessageUpdated(info)
      }
    }

    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as SessionInfo | undefined
      if (sessionInfo?.id) {
        handleSessionDeleted(sessionInfo.id)
      }
    }
  }

  const onSummarize = async (ctx: { sessionID: string; directory: string; summary?: string }): Promise<void> => {
    if (!config.enabled || !config.persist_on_compact) return
    if (!isConfigured()) return

    try {
      await persistSessionState(ctx.sessionID, ctx.directory, config, ctx.summary)
    } catch (error) {
      log("[memory-persistence] persist on summarize failed", { sessionId: ctx.sessionID, error: String(error) })
    }
  }

  return {
    event: eventHandler,
    onSummarize,
  }
}
