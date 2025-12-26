// Shared singleton for compaction coordination across hooks

export interface CompactionEvent {
  timestamp: number
  trigger: 'preemptive' | 'anthropic-auto' | 'manual'
  usageRatioBefore?: number
  usageRatioAfter?: number
}

interface CompactionState {
  lastCompaction: Map<string, CompactionEvent>
  inProgress: Set<string>
  pendingContinue: Set<string>
}

const globalState: CompactionState = {
  lastCompaction: new Map(),
  inProgress: new Set(),
  pendingContinue: new Set(),
}

// Cooldown after compaction before another can trigger
export const POST_COMPACTION_COOLDOWN_MS = 120_000

// Threshold to skip compaction if already under this after last compaction
export const POST_COMPACTION_THRESHOLD = 0.60

export function isCompactionAllowed(sessionID: string): boolean {
  if (globalState.inProgress.has(sessionID)) return false

  const lastEvent = globalState.lastCompaction.get(sessionID)
  if (!lastEvent) return true

  const elapsed = Date.now() - lastEvent.timestamp
  return elapsed > POST_COMPACTION_COOLDOWN_MS
}

export function markCompactionStart(sessionID: string, trigger: CompactionEvent['trigger'], usageRatio?: number): void {
  globalState.inProgress.add(sessionID)
  globalState.lastCompaction.set(sessionID, {
    timestamp: Date.now(),
    trigger,
    usageRatioBefore: usageRatio,
  })
}

export function markCompactionEnd(sessionID: string, usageRatioAfter?: number): void {
  globalState.inProgress.delete(sessionID)
  const event = globalState.lastCompaction.get(sessionID)
  if (event) {
    event.usageRatioAfter = usageRatioAfter
    event.timestamp = Date.now()
  }
}

export function shouldAutoContinue(sessionID: string): boolean {
  return false
}

export function markPendingContinue(sessionID: string): void {
  globalState.pendingContinue.add(sessionID)
}

export function clearPendingContinue(sessionID: string): void {
  globalState.pendingContinue.delete(sessionID)
}

export function hasPendingContinue(sessionID: string): boolean {
  return globalState.pendingContinue.has(sessionID)
}

export function cleanupSession(sessionID: string): void {
  globalState.lastCompaction.delete(sessionID)
  globalState.inProgress.delete(sessionID)
  globalState.pendingContinue.delete(sessionID)
}