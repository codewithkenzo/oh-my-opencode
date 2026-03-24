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

  test("keeps repeated launches isolated by call id within one parent session", () => {
    // #given repeated child launches from the same parent session
    storeToolMetadata("parent-session", "call-1", {
      title: "child one",
      metadata: { sessionId: "child-session-1" },
    })
    storeToolMetadata("parent-session", "call-2", {
      title: "child two",
      metadata: { sessionId: "child-session-2" },
    })

    // #when each call id is consumed independently
    const first = consumeToolMetadata("parent-session", "call-1")
    const second = consumeToolMetadata("parent-session", "call-2")

    // #then metadata does not cross-wire between launches
    expect(first).toEqual({
      title: "child one",
      metadata: { sessionId: "child-session-1" },
    })
    expect(second).toEqual({
      title: "child two",
      metadata: { sessionId: "child-session-2" },
    })
  })

  test("preserves unresolved launcher payload without adding sessionId", () => {
    // #given a launcher payload that has not resolved a child session yet
    storeToolMetadata("parent-session", "call-pending", {
      title: "launch child",
      metadata: {},
    })

    // #when the metadata is restored
    const restored = consumeToolMetadata("parent-session", "call-pending")

    // #then the title survives and sessionId stays omitted
    expect(restored).toEqual({
      title: "launch child",
      metadata: {},
    })
    expect(restored?.metadata ?? {}).not.toHaveProperty("sessionId")
  })

  test("queues metadata per session when callID is unavailable", () => {
    // #given runtime launcher metadata is stored without a tool call id
    storeToolMetadata("session-queue", undefined, {
      title: "queued title",
      metadata: { sessionId: "child-queued" },
    })

    // #when metadata is later consumed by a different after-hook call id
    const restored = consumeToolMetadata("session-queue", "after-call-1")

    // #then the queued metadata is restored for that session
    expect(restored).toEqual({
      title: "queued title",
      metadata: { sessionId: "child-queued" },
    })
  })

  test("prefers exact callID metadata before consuming queued fallback", () => {
    // #given one queued entry and one exact call-id entry in the same session
    storeToolMetadata("session-prefer", undefined, {
      title: "queued title",
      metadata: { sessionId: "child-queued" },
    })
    storeToolMetadata("session-prefer", "exact-call", {
      title: "exact title",
      metadata: { sessionId: "child-exact" },
    })

    // #when exact metadata is consumed first and fallback is consumed later
    const exact = consumeToolMetadata("session-prefer", "exact-call")
    const fallback = consumeToolMetadata("session-prefer", "different-after-call")

    // #then exact matching wins and queued fallback remains available afterward
    expect(exact).toEqual({
      title: "exact title",
      metadata: { sessionId: "child-exact" },
    })
    expect(fallback).toEqual({
      title: "queued title",
      metadata: { sessionId: "child-queued" },
    })
  })

  test("falls back to fifo order when no exact callID metadata exists", () => {
    // #given queued metadata exists but no matching exact call id does
    storeToolMetadata("session-fifo", undefined, {
      title: "first queued",
      metadata: { sessionId: "child-1" },
    })
    storeToolMetadata("session-fifo", undefined, {
      title: "second queued",
      metadata: { sessionId: "child-2" },
    })

    // #when two different after-hook call ids consume the session queue
    const first = consumeToolMetadata("session-fifo", "after-call-a")
    const second = consumeToolMetadata("session-fifo", "after-call-b")

    // #then queued entries are consumed in insertion order
    expect(first).toEqual({
      title: "first queued",
      metadata: { sessionId: "child-1" },
    })
    expect(second).toEqual({
      title: "second queued",
      metadata: { sessionId: "child-2" },
    })
  })

  test("keeps queued fallback isolated per session", () => {
    // #given multiple sessions each have their own queued fallback entries
    storeToolMetadata("session-a", undefined, {
      title: "session a first",
      metadata: { sessionId: "child-a-1" },
    })
    storeToolMetadata("session-b", undefined, {
      title: "session b first",
      metadata: { sessionId: "child-b-1" },
    })
    storeToolMetadata("session-a", undefined, {
      title: "session a second",
      metadata: { sessionId: "child-a-2" },
    })

    // #when each session consumes its own queued metadata
    const aFirst = consumeToolMetadata("session-a", "after-a-1")
    const bFirst = consumeToolMetadata("session-b", "after-b-1")
    const aSecond = consumeToolMetadata("session-a", "after-a-2")

    // #then fifo order is preserved independently per session
    expect(aFirst).toEqual({
      title: "session a first",
      metadata: { sessionId: "child-a-1" },
    })
    expect(bFirst).toEqual({
      title: "session b first",
      metadata: { sessionId: "child-b-1" },
    })
    expect(aSecond).toEqual({
      title: "session a second",
      metadata: { sessionId: "child-a-2" },
    })
  })
})
