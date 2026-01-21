import { describe, it, expect, beforeEach } from "bun:test"
import {
  markForkActive,
  clearForkActive,
  isForkActive,
  _resetForTesting,
} from "../claude-code-session-state/state"

describe("Context Fork State Management", () => {
  beforeEach(() => {
    _resetForTesting()
  })

  describe("markForkActive", () => {
    it("marks a session as forking", () => {
      // #given a session ID
      const sessionId = "session-123"

      // #when we mark it as fork active
      markForkActive(sessionId)

      // #then it should be marked as active
      expect(isForkActive(sessionId)).toBe(true)
    })

    it("throws on nested fork attempt", () => {
      // #given a session already marked as forking
      const sessionId = "session-123"
      markForkActive(sessionId)

      // #when we try to mark it again
      // #then it should throw
      expect(() => markForkActive(sessionId)).toThrow(
        "Session session-123 is already in a forked context. Nested forks are not supported."
      )
    })

    it("allows different sessions to fork independently", () => {
      // #given two different session IDs
      const session1 = "session-1"
      const session2 = "session-2"

      // #when we mark both as forking
      markForkActive(session1)
      markForkActive(session2)

      // #then both should be active
      expect(isForkActive(session1)).toBe(true)
      expect(isForkActive(session2)).toBe(true)
    })
  })

  describe("clearForkActive", () => {
    it("clears fork state for a session", () => {
      // #given a session marked as forking
      const sessionId = "session-123"
      markForkActive(sessionId)

      // #when we clear it
      clearForkActive(sessionId)

      // #then it should no longer be active
      expect(isForkActive(sessionId)).toBe(false)
    })

    it("allows re-marking after clear", () => {
      // #given a session marked, cleared
      const sessionId = "session-123"
      markForkActive(sessionId)
      clearForkActive(sessionId)

      // #when we mark it again
      // #then it should succeed without throwing
      expect(() => markForkActive(sessionId)).not.toThrow()
      expect(isForkActive(sessionId)).toBe(true)
    })

    it("is safe to call on non-forking session", () => {
      // #given a session that was never marked
      const sessionId = "never-marked"

      // #when we clear it
      // #then it should not throw
      expect(() => clearForkActive(sessionId)).not.toThrow()
    })
  })

  describe("isForkActive", () => {
    it("returns false for unknown session", () => {
      // #given a session ID that was never marked
      const sessionId = "unknown-session"

      // #when we check if it's active
      // #then it should return false
      expect(isForkActive(sessionId)).toBe(false)
    })

    it("returns true only for active sessions", () => {
      // #given one active and one cleared session
      const active = "active-session"
      const cleared = "cleared-session"
      markForkActive(active)
      markForkActive(cleared)
      clearForkActive(cleared)

      // #then isForkActive should reflect correct state
      expect(isForkActive(active)).toBe(true)
      expect(isForkActive(cleared)).toBe(false)
    })
  })
})
