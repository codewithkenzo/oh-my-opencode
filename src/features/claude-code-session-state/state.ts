export const subagentSessions = new Set<string>()

const activeForkedSessions = new Set<string>()

/**
 * Atomically marks a session as actively forking.
 * @throws Error if session is already in a fork (prevents nested forks)
 */
export function markForkActive(sessionId: string): void {
  if (activeForkedSessions.has(sessionId)) {
    throw new Error(`Session ${sessionId} is already in a forked context. Nested forks are not supported.`)
  }
  activeForkedSessions.add(sessionId)
}

export function clearForkActive(sessionId: string): void {
  activeForkedSessions.delete(sessionId)
}

export function isForkActive(sessionId: string): boolean {
  return activeForkedSessions.has(sessionId)
}

let _mainSessionID: string | undefined

export function setMainSession(id: string | undefined) {
  _mainSessionID = id
}

export function getMainSessionID(): string | undefined {
  return _mainSessionID
}

export function clearMainSession(): void {
  _mainSessionID = undefined
}

/** @internal For testing only */
export function _resetForTesting(): void {
  _mainSessionID = undefined
  subagentSessions.clear()
  activeForkedSessions.clear()
}

const sessionAgentMap = new Map<string, string>()

export function setSessionAgent(sessionID: string, agent: string): void {
  if (!sessionAgentMap.has(sessionID)) {
    sessionAgentMap.set(sessionID, agent)
  }
}

export function updateSessionAgent(sessionID: string, agent: string): void {
  sessionAgentMap.set(sessionID, agent)
}

export function getSessionAgent(sessionID: string): string | undefined {
  return sessionAgentMap.get(sessionID)
}

export function clearSessionAgent(sessionID: string): void {
  sessionAgentMap.delete(sessionID)
}
