import { existsSync, readdirSync } from "node:fs"
import { join } from "node:path"
import type { PluginInput } from "@opencode-ai/plugin"
import type { ExperimentalConfig } from "../../config"
import type { PreemptiveCompactionState, TokenInfo } from "./types"
import {
  DEFAULT_THRESHOLD,
  MIN_TOKENS_FOR_COMPACTION,
  COMPACTION_COOLDOWN_MS,
} from "./constants"
import {
  findNearestMessageWithFields,
  MESSAGE_STORAGE,
  injectHookMessage,
} from "../../features/hook-message-injector"
import { log } from "../../shared/logger"
import { showToast } from "../../shared/toast"
import {
  isCompactionAllowed,
  markCompactionStart,
  markCompactionEnd,
  markPendingContinue,
  cleanupSession
} from '../compaction-state'
import { getSupermemoryIntegration, createMemoryInjectionPrompt } from './supermemory'

export interface SummarizeContext {
  sessionID: string
  providerID: string
  modelID: string
  usageRatio: number
  directory: string
}

export type BeforeSummarizeCallback = (ctx: SummarizeContext) => Promise<void> | void

export type GetModelLimitCallback = (providerID: string, modelID: string) => number | undefined

export interface PreemptiveCompactionOptions {
  experimental?: ExperimentalConfig
  onBeforeSummarize?: BeforeSummarizeCallback
  getModelLimit?: GetModelLimitCallback
}

interface MessageInfo {
  id: string
  role: string
  sessionID: string
  providerID?: string
  modelID?: string
  tokens?: TokenInfo
  summary?: boolean
  finish?: boolean
}

interface MessageWrapper {
  info: MessageInfo
}

// Match all Antigravity models (google/*) and direct Claude models
const SUPPORTED_MODEL_PATTERN = /^google\/|claude-(opus|sonnet|haiku)/i
const DEFAULT_CONTEXT_LIMIT = 200_000

function isSupportedModel(modelID: string): boolean {
  return SUPPORTED_MODEL_PATTERN.test(modelID)
}

function getMessageDir(sessionID: string): string | null {
  if (!existsSync(MESSAGE_STORAGE)) return null

  const directPath = join(MESSAGE_STORAGE, sessionID)
  if (existsSync(directPath)) return directPath

  for (const dir of readdirSync(MESSAGE_STORAGE)) {
    const sessionPath = join(MESSAGE_STORAGE, dir, sessionID)
    if (existsSync(sessionPath)) return sessionPath
  }

  return null
}

function createState(): PreemptiveCompactionState {
  return {
    lastCompactionTime: new Map(),
    compactionInProgress: new Set(),
  }
}

export function createPreemptiveCompactionHook(
  ctx: PluginInput,
  options?: PreemptiveCompactionOptions
) {
  const experimental = options?.experimental
  const onBeforeSummarize = options?.onBeforeSummarize
  const getModelLimit = options?.getModelLimit
  const enabled = experimental?.preemptive_compaction !== false
  const threshold = experimental?.preemptive_compaction_threshold ?? DEFAULT_THRESHOLD

  if (!enabled) {
    return { event: async () => {} }
  }

  const state = createState()

  const notifiedThresholds = new Map<string, Set<number>>()

  function getNotifiedThresholds(sessionID: string): Set<number> {
    if (!notifiedThresholds.has(sessionID)) {
      notifiedThresholds.set(sessionID, new Set())
    }
    return notifiedThresholds.get(sessionID)!
  }

  async function notifyContextProgress(
    sessionID: string,
    usageRatio: number
  ): Promise<void> {
    const thresholds = getNotifiedThresholds(sessionID)
    const percentages = [20, 40, 60, 80]

    for (const pct of percentages) {
      const ratio = pct / 100
      if (usageRatio >= ratio && !thresholds.has(pct)) {
        thresholds.add(pct)
        showToast(ctx, {
          title: "Context Window",
          message: `${pct}% context used - ${pct >= 60 ? 'consider wrapping up current task' : 'proceeding normally'}`,
          variant: pct >= 80 ? "warning" : "info",
          duration: 2000,
        })
      }
    }
  }

  const checkAndTriggerCompaction = async (
    sessionID: string,
    lastAssistant: MessageInfo
  ): Promise<void> => {
    if (state.compactionInProgress.has(sessionID)) return

    const lastCompaction = state.lastCompactionTime.get(sessionID) ?? 0
    if (Date.now() - lastCompaction < COMPACTION_COOLDOWN_MS) return

    if (!isCompactionAllowed(sessionID)) {
      log("[preemptive-compaction] skipping - recent compaction in progress or cooling down", { sessionID })
      return
    }

    if (lastAssistant.summary === true) return

    const tokens = lastAssistant.tokens
    if (!tokens) return

    const modelID = lastAssistant.modelID ?? ""
    const providerID = lastAssistant.providerID ?? ""

    if (!isSupportedModel(modelID)) {
      log("[preemptive-compaction] skipping unsupported model", { modelID })
      return
    }

    const configLimit = getModelLimit?.(providerID, modelID)
    const contextLimit = configLimit ?? DEFAULT_CONTEXT_LIMIT
    const totalUsed = tokens.input + tokens.cache.read + tokens.output

    if (totalUsed < MIN_TOKENS_FOR_COMPACTION) return

    const usageRatio = totalUsed / contextLimit

    await notifyContextProgress(sessionID, usageRatio)

    log("[preemptive-compaction] checking", {
      sessionID,
      totalUsed,
      contextLimit,
      usageRatio: usageRatio.toFixed(2),
      threshold,
    })

    if (usageRatio < threshold) return

    state.compactionInProgress.add(sessionID)
    state.lastCompactionTime.set(sessionID, Date.now())
    markCompactionStart(sessionID, 'preemptive', usageRatio)

    if (!providerID || !modelID) {
      state.compactionInProgress.delete(sessionID)
      return
    }

    showToast(ctx, {
      title: "Preemptive Compaction",
      message: `Context at ${(usageRatio * 100).toFixed(0)}% - compacting to prevent overflow...`,
      variant: "warning",
      duration: 3000,
    })

    log("[preemptive-compaction] triggering compaction", { sessionID, usageRatio })

    try {
      if (onBeforeSummarize) {
        await onBeforeSummarize({
          sessionID,
          providerID,
          modelID,
          usageRatio,
          directory: ctx.directory,
        })
      }

      // Inject supermemory context if available and enabled
      const injectMemory = experimental?.inject_supermemory_context !== false
      if (injectMemory) {
        const supermemoryIntegration = getSupermemoryIntegration()
        if (supermemoryIntegration?.isConfigured()) {
          try {
            const tags = supermemoryIntegration.getTags(ctx.directory)
            const memories = await supermemoryIntegration.fetchProjectMemories(tags.project, 10)
            if (memories.length > 0) {
              const prompt = createMemoryInjectionPrompt(memories)
              injectHookMessage(sessionID, prompt, { model: { providerID, modelID } })
              log("[preemptive-compaction] memory context injected", { memoriesCount: memories.length })
            }
          } catch (err) {
            log("[preemptive-compaction] failed to inject memory context", { error: String(err) })
          }
        }
      }

      // Non-blocking: trigger compaction without awaiting to prevent streaming interruption
      ctx.client.session.summarize({
        path: { id: sessionID },
        body: { providerID, modelID },
        query: { directory: ctx.directory },
      }).then(() => {
        showToast(ctx, {
          title: "Compaction Complete",
          message: "Session compacted. Send any message to continue.",
          variant: "success",
          duration: 2000,
        })
        markPendingContinue(sessionID)
      }).catch((err) => {
        log("[preemptive-compaction] compaction failed", { sessionID, error: err })
      }).finally(() => {
        markCompactionEnd(sessionID)
        state.compactionInProgress.delete(sessionID)
      })

      return
    } catch (err) {
      log("[preemptive-compaction] compaction failed", { sessionID, error: err })
      state.compactionInProgress.delete(sessionID)
    }
  }

  const eventHandler = async ({ event }: { event: { type: string; properties?: unknown } }) => {
    const props = event.properties as Record<string, unknown> | undefined

    if (event.type === "session.deleted") {
      const sessionInfo = props?.info as { id?: string } | undefined
      if (sessionInfo?.id) {
        state.lastCompactionTime.delete(sessionInfo.id)
        state.compactionInProgress.delete(sessionInfo.id)
        cleanupSession(sessionInfo.id)
        notifiedThresholds.delete(sessionInfo.id)
      }
      return
    }

    if (event.type === "message.updated") {
      const info = props?.info as MessageInfo | undefined
      if (!info) return

      if (info.role !== "assistant" || !info.finish) return

      const sessionID = info.sessionID
      if (!sessionID) return

      // Non-blocking: trigger compaction in next tick to avoid blocking event loop
      setTimeout(() => {
        checkAndTriggerCompaction(sessionID, info).catch((err) => {
          log("[preemptive-compaction] background compaction failed", { sessionID, error: err })
        })
      }, 0)
      return
    }

    if (event.type === "session.idle") {
      const sessionID = props?.sessionID as string | undefined
      if (!sessionID) return

      try {
        const resp = await ctx.client.session.messages({
          path: { id: sessionID },
          query: { directory: ctx.directory },
        })

        const messages = (resp.data ?? resp) as MessageWrapper[]
        const assistants = messages
          .filter((m) => m.info.role === "assistant")
          .map((m) => m.info)

        if (assistants.length === 0) return

        const lastAssistant = assistants[assistants.length - 1]

        if (!lastAssistant.providerID || !lastAssistant.modelID) {
          const messageDir = getMessageDir(sessionID)
          const storedMessage = messageDir ? findNearestMessageWithFields(messageDir) : null
          if (storedMessage?.model?.providerID && storedMessage?.model?.modelID) {
            lastAssistant.providerID = storedMessage.model.providerID
            lastAssistant.modelID = storedMessage.model.modelID
            log("[preemptive-compaction] using stored message model info", {
              sessionID,
              providerID: lastAssistant.providerID,
              modelID: lastAssistant.modelID,
            })
          }
        }

        // Non-blocking: trigger compaction in next tick
        setTimeout(() => {
          checkAndTriggerCompaction(sessionID, lastAssistant).catch((err) => {
            log("[preemptive-compaction] background idle compaction failed", { sessionID, error: err })
          })
        }, 0)
      } catch {}
    }
  }

  return {
    event: eventHandler,
  }
}
