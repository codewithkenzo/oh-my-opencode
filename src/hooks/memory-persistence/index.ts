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
  const sessionMessages = new Map<string, Array<{ role: string; content: string }>>()

  async function handleSessionCreated(sessionInfo: SessionInfo): Promise<void> {
    if (!config.enabled || !config.recall_on_start) return
    if (!sessionInfo.id) return
    if (sessionInfo.parentID) {
      log("[memory-persistence] skip recall for child session", { sessionId: sessionInfo.id })
      return
    }
    if (processedSessions.has(sessionInfo.id)) return

    if (!isConfigured()) {
      log("[memory-persistence] supermemory not configured, skip recall")
      return
    }

    processedSessions.add(sessionInfo.id)

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
    }
  }

  async function handleSessionIdle(sessionId: string): Promise<void> {
    if (!config.enabled || !config.extract_patterns) return
    if (!isConfigured()) return

    const messages = sessionMessages.get(sessionId)
    if (!messages || messages.length < config.min_session_length) {
      log("[memory-persistence] skip extraction - insufficient messages", {
        sessionId,
        count: messages?.length || 0,
      })
      return
    }

    try {
      const result = await extractPatterns(sessionId, ctx.directory, config, messages)
      log("[memory-persistence] extraction complete", {
        sessionId,
        detected: result.patterns.length,
        stored: result.storedCount,
      })
    } catch (error) {
      log("[memory-persistence] extraction failed", { sessionId, error: String(error) })
    }
  }

  function handleMessageUpdated(info: MessageInfo & { sessionID?: string }): void {
    if (!info.sessionID || !info.role || !info.content) return

    let messages = sessionMessages.get(info.sessionID)
    if (!messages) {
      messages = []
      sessionMessages.set(info.sessionID, messages)
    }

    messages.push({ role: info.role, content: info.content })
  }

  function handleSessionDeleted(sessionId: string): void {
    processedSessions.delete(sessionId)
    sessionMessages.delete(sessionId)
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
