import { describe, test, expect, beforeEach } from "bun:test"
import {
  setThoughtSignature,
  getThoughtSignature,
  getLatestSignature,
  getSignatureForSession,
  clearSessionSignatures,
  clearAllSignatures,
  getOrCreateSessionId,
} from "./thought-signature-store"

describe("thought-signature-store", () => {
  beforeEach(() => {
    clearAllSignatures()
  })

  describe("getSignatureForSession", () => {
    test("returns signature when session has stored signature via fetchInstanceId", () => {
      const sessionID = "ses_abc123"
      const fetchInstanceId = `fetch_${sessionID}_1`
      const signature = "sig_test_123"

      getOrCreateSessionId(fetchInstanceId, sessionID)
      setThoughtSignature(fetchInstanceId, signature)

      const result = getSignatureForSession(sessionID)
      expect(result).toBe(signature)
    })

    test("falls back to latest signature when session has no specific signature", () => {
      // Cross-session fallback is required - Claude API returns errors when
      // signatures are missing for thinking blocks with tool use
      const otherFetchId = "fetch_other_session"
      const signature = "sig_fallback"

      setThoughtSignature(otherFetchId, signature)

      const result = getSignatureForSession("ses_unknown")
      expect(result).toBe(signature) // Fallback, not undefined
    })

    test("returns undefined when no signatures exist", () => {
      const result = getSignatureForSession("ses_nonexistent")
      expect(result).toBeUndefined()
    })

    test("returns session-specific signature even when other signatures exist", () => {
      const sessionID = "ses_target"
      const targetFetchId = `fetch_${sessionID}`
      const otherFetchId = "fetch_other"

      getOrCreateSessionId(targetFetchId, sessionID)
      setThoughtSignature(targetFetchId, "sig_target")
      setThoughtSignature(otherFetchId, "sig_other")

      const result = getSignatureForSession(sessionID)
      expect(result).toBe("sig_target")
    })

    test("matches sessionID when fetchInstanceId includes sessionID", () => {
      const sessionID = "ses_xyz"
      const fetchInstanceId = `fetch_instance_with_${sessionID}_embedded`
      const signature = "sig_embedded"

      setThoughtSignature(fetchInstanceId, signature)

      const result = getSignatureForSession(sessionID)
      expect(result).toBe(signature)
    })

    test("prefers exact sessionID match over latest signature", () => {
      const sessionID = "ses_exact"
      const exactFetchId = `fetch_${sessionID}`
      const otherFetchId = "fetch_other"

      getOrCreateSessionId(exactFetchId, sessionID)
      setThoughtSignature(exactFetchId, "sig_exact")
      setThoughtSignature(otherFetchId, "sig_other")

      const result = getSignatureForSession(sessionID)
      expect(result).toBe("sig_exact")
    })
  })

  describe("clearSessionSignatures", () => {
    test("clears signatures for specific session", () => {
      const sessionID = "ses_to_clear"
      const fetchId = `fetch_${sessionID}`

      getOrCreateSessionId(fetchId, sessionID)
      setThoughtSignature(fetchId, "sig_to_clear")

      expect(getThoughtSignature(fetchId)).toBe("sig_to_clear")

      clearSessionSignatures(sessionID)

      expect(getThoughtSignature(fetchId)).toBeUndefined()
    })

    test("does not affect other sessions", () => {
      const session1 = "ses_one"
      const session2 = "ses_two"
      const fetch1 = `fetch_${session1}`
      const fetch2 = `fetch_${session2}`

      getOrCreateSessionId(fetch1, session1)
      getOrCreateSessionId(fetch2, session2)
      setThoughtSignature(fetch1, "sig_one")
      setThoughtSignature(fetch2, "sig_two")

      clearSessionSignatures(session1)

      expect(getThoughtSignature(fetch1)).toBeUndefined()
      expect(getThoughtSignature(fetch2)).toBe("sig_two")
    })

    test("handles session with no signatures gracefully", () => {
      expect(() => clearSessionSignatures("ses_nonexistent")).not.toThrow()
    })

    test("clears all matching fetchInstanceIds that include sessionID", () => {
      const sessionID = "ses_multi"
      const fetch1 = `fetch_${sessionID}_1`
      const fetch2 = `fetch_${sessionID}_2`
      const fetch3 = "fetch_other"

      getOrCreateSessionId(fetch1, sessionID)
      getOrCreateSessionId(fetch2, sessionID)
      setThoughtSignature(fetch1, "sig_one")
      setThoughtSignature(fetch2, "sig_two")
      setThoughtSignature(fetch3, "sig_other")

      clearSessionSignatures(sessionID)

      expect(getThoughtSignature(fetch1)).toBeUndefined()
      expect(getThoughtSignature(fetch2)).toBeUndefined()
      expect(getThoughtSignature(fetch3)).toBe("sig_other")
    })

    test("clears both signature and sessionId for matching entries", () => {
      const sessionID = "ses_cleanup"
      const fetchId = `fetch_${sessionID}`

      getOrCreateSessionId(fetchId, sessionID)
      setThoughtSignature(fetchId, "sig_cleanup")

      expect(getThoughtSignature(fetchId)).toBe("sig_cleanup")

      clearSessionSignatures(sessionID)

      expect(getThoughtSignature(fetchId)).toBeUndefined()

      const newSessionId = getOrCreateSessionId(fetchId)
      expect(newSessionId).not.toBe(sessionID)
    })
  })
})
