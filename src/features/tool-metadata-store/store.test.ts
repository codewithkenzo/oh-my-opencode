import { beforeEach, describe, expect, test } from "bun:test"

import {
  clearPendingStore,
  consumeToolMetadata,
  getPendingStoreSize,
  storeToolMetadata,
} from "./store"

const originalDateNow = Date.now

describe("tool metadata store", () => {
  beforeEach(() => {
    Date.now = originalDateNow
    clearPendingStore()
  })

  test("stores metadata and consumes it once", () => {
    // #given metadata is stored for a session/call pair
    storeToolMetadata("session-1", "call-1", {
      title: "Tool Title",
      metadata: { sessionId: "abc", custom: true },
    })

    // #when the metadata is consumed
    const firstRead = consumeToolMetadata("session-1", "call-1")
    const secondRead = consumeToolMetadata("session-1", "call-1")

    // #then the first read returns data and the second returns undefined
    expect(firstRead).toEqual({
      title: "Tool Title",
      metadata: { sessionId: "abc", custom: true },
    })
    expect(secondRead).toBeUndefined()
  })

  test("returns undefined when key does not exist", () => {
    // #given no metadata is stored for the requested key

    // #when metadata is consumed
    const result = consumeToolMetadata("missing-session", "missing-call")

    // #then undefined is returned
    expect(result).toBeUndefined()
  })

  test("cleans up stale entries during store", () => {
    // #given one stale entry and one fresh entry across time
    let now = 0
    Date.now = () => now

    storeToolMetadata("session-stale", "call-stale", { title: "stale" })

    now = 15 * 60 * 1000 + 1
    storeToolMetadata("session-fresh", "call-fresh", { title: "fresh" })

    // #when metadata is consumed after cleanup is triggered
    const stale = consumeToolMetadata("session-stale", "call-stale")
    const fresh = consumeToolMetadata("session-fresh", "call-fresh")

    // #then stale metadata is removed and fresh metadata remains
    expect(stale).toBeUndefined()
    expect(fresh).toEqual({ title: "fresh" })
  })

  test("clears all pending entries", () => {
    // #given multiple pending metadata entries
    storeToolMetadata("session-1", "call-1", { title: "one" })
    storeToolMetadata("session-2", "call-2", { title: "two" })

    // #when the pending store is cleared
    clearPendingStore()

    // #then all entries are removed
    expect(getPendingStoreSize()).toBe(0)
  })

  test("returns current pending store size", () => {
    // #given pending metadata entries are added and consumed
    storeToolMetadata("session-1", "call-1", { title: "one" })
    storeToolMetadata("session-2", "call-2", { title: "two" })

    // #when size is read before and after consuming one entry
    const sizeBefore = getPendingStoreSize()
    consumeToolMetadata("session-1", "call-1")
    const sizeAfter = getPendingStoreSize()

    // #then the reported size matches pending entries
    expect(sizeBefore).toBe(2)
    expect(sizeAfter).toBe(1)
  })
})
