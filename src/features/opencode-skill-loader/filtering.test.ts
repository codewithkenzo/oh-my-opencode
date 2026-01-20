import { describe, it, expect, beforeEach } from "bun:test"
import {
  markSessionAsSlashCommand,
  isSlashCommandSession,
  _resetForTesting,
} from "../../hooks/skill-invocation-filter"

describe("Skill Invocation Filtering", () => {
  beforeEach(() => {
    _resetForTesting()
  })

  describe("markSessionAsSlashCommand", () => {
    it("marks session as slash command initiated", () => {
      // #given a session ID
      const sessionId = "session-123"

      // #when we mark it as slash command
      markSessionAsSlashCommand(sessionId)

      // #then it should be recognized as slash command session
      expect(isSlashCommandSession(sessionId)).toBe(true)
    })

    it("allows multiple sessions to be marked", () => {
      // #given two session IDs
      const session1 = "session-1"
      const session2 = "session-2"

      // #when we mark both
      markSessionAsSlashCommand(session1)
      markSessionAsSlashCommand(session2)

      // #then both should be recognized
      expect(isSlashCommandSession(session1)).toBe(true)
      expect(isSlashCommandSession(session2)).toBe(true)
    })
  })

  describe("isSlashCommandSession", () => {
    it("returns false for unmarked session", () => {
      // #given an unmarked session
      const sessionId = "unmarked-session"

      // #then it should return false
      expect(isSlashCommandSession(sessionId)).toBe(false)
    })

    it("returns true for marked session", () => {
      // #given a marked session
      const sessionId = "marked-session"
      markSessionAsSlashCommand(sessionId)

      // #then it should return true
      expect(isSlashCommandSession(sessionId)).toBe(true)
    })
  })

  describe("auto-cleanup", () => {
    it.skip("clears session after 5 seconds", async () => {
      // #given a marked session
      const sessionId = "expiring-session"
      markSessionAsSlashCommand(sessionId)

      // #when we wait 5.5 seconds
      await new Promise(resolve => setTimeout(resolve, 5500))

      // #then it should be cleared
      expect(isSlashCommandSession(sessionId)).toBe(false)
    })
  })
})
