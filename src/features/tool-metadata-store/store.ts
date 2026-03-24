/**
 * Pending tool metadata store.
 *
 * OpenCode's `fromPlugin()` wrapper always replaces the metadata returned by
 * plugin tools with `{ truncated, outputPath }`, discarding any sessionId,
 * title, or custom metadata set during `execute()`.
 *
 * This store captures metadata written via `ctx.metadata()` inside execute(),
 * then the `tool.execute.after` hook consumes it and merges it back into the
 * result *before* the processor writes the final part to the session store.
 *
 * Flow:
 *   execute() → storeToolMetadata(sessionID, callID, data)
 *   fromPlugin() → overwrites metadata with { truncated }
 *   tool.execute.after → consumeToolMetadata(sessionID, callID) → merges back
 *   processor → Session.updatePart(status:"completed", metadata: result.metadata)
 */

export interface PendingToolMetadata {
  title?: string
  metadata?: Record<string, unknown>
}

type StoredToolMetadata = PendingToolMetadata & { storedAt: number }

const pendingStore = new Map<string, StoredToolMetadata>()
const pendingQueueStore = new Map<string, StoredToolMetadata[]>()

const STALE_TIMEOUT_MS = 15 * 60 * 1000

function makeKey(sessionID: string, callID: string): string {
  return `${sessionID}:${callID}`
}

function cleanupStaleEntries(): void {
  const now = Date.now()

  for (const [key, entry] of pendingStore) {
    if (now - entry.storedAt > STALE_TIMEOUT_MS) {
      pendingStore.delete(key)
    }
  }

  for (const [sessionID, entries] of pendingQueueStore) {
    const freshEntries = entries.filter((entry) => now - entry.storedAt <= STALE_TIMEOUT_MS)
    if (freshEntries.length === 0) {
      pendingQueueStore.delete(sessionID)
      continue
    }
    if (freshEntries.length !== entries.length) {
      pendingQueueStore.set(sessionID, freshEntries)
    }
  }
}

export function storeToolMetadata(
  sessionID: string,
  callID: string | undefined,
  data: PendingToolMetadata
): void {
  cleanupStaleEntries()
  const entry: StoredToolMetadata = { ...data, storedAt: Date.now() }

  if (typeof callID === "string" && callID.trim() !== "") {
    pendingStore.set(makeKey(sessionID, callID), entry)
    return
  }

  const queuedEntries = pendingQueueStore.get(sessionID) ?? []
  queuedEntries.push(entry)
  pendingQueueStore.set(sessionID, queuedEntries)
}

export function consumeToolMetadata(
  sessionID: string,
  callID: string
): PendingToolMetadata | undefined {
  cleanupStaleEntries()

  const key = makeKey(sessionID, callID)
  const stored = pendingStore.get(key)
  if (stored) {
    pendingStore.delete(key)
    const { storedAt: _, ...data } = stored
    return data
  }

  const queuedEntries = pendingQueueStore.get(sessionID)
  const queued = queuedEntries?.shift()
  if (queued && queuedEntries) {
    if (queuedEntries.length === 0) {
      pendingQueueStore.delete(sessionID)
    }
    const { storedAt: _, ...data } = queued
    return data
  }

  return undefined
}

export function getPendingStoreSize(): number {
  let queuedEntryCount = 0
  for (const entries of pendingQueueStore.values()) {
    queuedEntryCount += entries.length
  }
  return pendingStore.size + queuedEntryCount
}

export function clearPendingStore(): void {
  pendingStore.clear()
  pendingQueueStore.clear()
}
